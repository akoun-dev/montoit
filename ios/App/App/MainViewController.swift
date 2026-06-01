import UIKit
import Capacitor
import WebKit

/// ViewController principal — étend CAPBridgeViewController et ajoute :
/// 1. Un overlay splash (icône centrée + 3 points orange animés)
/// 2. Auto-hide de l'overlay quand la WebView a fini de charger l'URL distante
/// 3. Contraintes Auto Layout sur la WebView pour respecter la safe-area
/// 4. Status bar adaptative selon le thème courant (système iOS + thème de la page web)
class MainViewController: CAPBridgeViewController, WKScriptMessageHandler {

    private static let splashMaxTimeout: TimeInterval = 15.0
    private static let dotColor = UIColor(red: 249/255, green: 115/255, blue: 22/255, alpha: 1.0) // #F97316
    private static let lightBackground = UIColor.white
    private static let darkBackground = UIColor(red: 17/255, green: 24/255, blue: 39/255, alpha: 1.0) // gray-900 Tailwind

    private var splashOverlay: UIView?
    private var progressObservation: NSKeyValueObservation?
    private var timeoutWorkItem: DispatchWorkItem?
    private var splashHidden = false
    private var isDarkMode: Bool = false

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        isDarkMode = (traitCollection.userInterfaceStyle == .dark)
        view.backgroundColor = currentBackground
        constrainWebViewToSafeArea()
        injectThemeWatcher()
        showSplashOverlay()
        observeWebViewProgress()
        setNeedsStatusBarAppearanceUpdate()
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        if traitCollection.hasDifferentColorAppearance(comparedTo: previousTraitCollection) {
            setDarkMode(traitCollection.userInterfaceStyle == .dark)
        }
    }

    /// Status bar : icônes claires en dark, foncées en light.
    override var preferredStatusBarStyle: UIStatusBarStyle {
        if #available(iOS 13.0, *) {
            return isDarkMode ? .lightContent : .darkContent
        }
        return .default
    }

    // MARK: - Theme

    private var currentBackground: UIColor {
        isDarkMode ? MainViewController.darkBackground : MainViewController.lightBackground
    }

    /// Bascule le thème natif. Touche UNIQUEMENT :
    /// - view.backgroundColor (visible dans la zone safe-area top/bottom autour de la WebView)
    /// - splashOverlay.backgroundColor (si l'overlay est encore visible)
    /// - la status bar (via preferredStatusBarStyle)
    /// Le fond de la WebView elle-même est laissé tel quel — c'est la page web qui gère
    /// sa propre couleur de fond via CSS (sinon on cache certains éléments transparents
    /// comme la navbar).
    private func setDarkMode(_ dark: Bool) {
        guard dark != isDarkMode else { return }
        isDarkMode = dark
        view.backgroundColor = currentBackground
        splashOverlay?.backgroundColor = currentBackground
        setNeedsStatusBarAppearanceUpdate()
    }

    /// Injecte un MutationObserver qui surveille la classe `dark` (Tailwind) sur <html>
    /// et notifie le natif quand l'utilisateur toggle le thème depuis l'app web.
    private func injectThemeWatcher() {
        guard let webView = bridge?.webView else { return }
        let controller = webView.configuration.userContentController
        controller.add(self, name: "themeChanged")

        let script = """
        (function() {
            function detect() {
                var html = document.documentElement;
                var isDark = html.classList.contains('dark') ||
                             html.getAttribute('data-theme') === 'dark';
                try { window.webkit.messageHandlers.themeChanged.postMessage({ dark: isDark }); } catch (e) {}
            }
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', detect);
            } else {
                detect();
            }
            new MutationObserver(detect).observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class', 'data-theme']
            });
        })();
        """
        let userScript = WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        controller.addUserScript(userScript)
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "themeChanged",
              let body = message.body as? [String: Any],
              let dark = body["dark"] as? Bool else { return }
        DispatchQueue.main.async { self.setDarkMode(dark) }
    }

    // MARK: - WebView safe-area constraint

    /// Force la WebView à rester strictement dans la safe-area (sous la status bar)
    /// pour qu'aucun contenu web ne déborde derrière la barre de tâche.
    /// On ne touche PAS le fond de la WebView ici — la page web gère sa propre couleur.
    private func constrainWebViewToSafeArea() {
        guard let webView = bridge?.webView else { return }
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
        ])
    }

    // MARK: - Splash overlay

    private func showSplashOverlay() {
        let overlay = UIView(frame: view.bounds)
        overlay.backgroundColor = currentBackground
        overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        let container = UIStackView()
        container.axis = .vertical
        container.alignment = .center
        container.spacing = 32
        container.translatesAutoresizingMaskIntoConstraints = false

        let iconView = UIImageView(image: UIImage(named: "SplashIcon"))
        iconView.contentMode = .scaleAspectFit
        iconView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            iconView.widthAnchor.constraint(equalToConstant: 120),
            iconView.heightAnchor.constraint(equalToConstant: 120)
        ])

        let dotsContainer = UIStackView()
        dotsContainer.axis = .horizontal
        dotsContainer.alignment = .center
        dotsContainer.spacing = 8
        dotsContainer.translatesAutoresizingMaskIntoConstraints = false

        let dot1 = makeDot()
        let dot2 = makeDot()
        let dot3 = makeDot()
        dotsContainer.addArrangedSubview(dot1)
        dotsContainer.addArrangedSubview(dot2)
        dotsContainer.addArrangedSubview(dot3)

        container.addArrangedSubview(iconView)
        container.addArrangedSubview(dotsContainer)
        overlay.addSubview(container)

        NSLayoutConstraint.activate([
            container.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            container.centerYAnchor.constraint(equalTo: overlay.centerYAnchor)
        ])

        view.addSubview(overlay)
        splashOverlay = overlay

        animateDot(dot1, delay: 0)
        animateDot(dot2, delay: 0.2)
        animateDot(dot3, delay: 0.4)

        let work = DispatchWorkItem { [weak self] in self?.hideSplashOverlay() }
        timeoutWorkItem = work
        DispatchQueue.main.asyncAfter(deadline: .now() + MainViewController.splashMaxTimeout, execute: work)
    }

    private func makeDot() -> UIView {
        let dot = UIView()
        dot.backgroundColor = MainViewController.dotColor
        dot.layer.cornerRadius = 5
        dot.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            dot.widthAnchor.constraint(equalToConstant: 10),
            dot.heightAnchor.constraint(equalToConstant: 10)
        ])
        dot.alpha = 0.25
        return dot
    }

    private func animateDot(_ dot: UIView, delay: TimeInterval) {
        UIView.animateKeyframes(
            withDuration: 1.0,
            delay: delay,
            options: [.repeat, .calculationModeLinear],
            animations: {
                UIView.addKeyframe(withRelativeStartTime: 0.0, relativeDuration: 0.5) {
                    dot.alpha = 1.0
                }
                UIView.addKeyframe(withRelativeStartTime: 0.5, relativeDuration: 0.5) {
                    dot.alpha = 0.25
                }
            },
            completion: nil
        )
    }

    // MARK: - WebView progress

    private func observeWebViewProgress() {
        guard let webView = bridge?.webView else { return }
        progressObservation = webView.observe(\.estimatedProgress, options: [.new]) { [weak self] _, change in
            guard let self = self, let progress = change.newValue else { return }
            if progress >= 1.0 {
                DispatchQueue.main.async { self.hideSplashOverlay() }
            }
        }
    }

    private func hideSplashOverlay() {
        guard !splashHidden, let overlay = splashOverlay else { return }
        splashHidden = true
        timeoutWorkItem?.cancel()
        progressObservation?.invalidate()
        progressObservation = nil
        UIView.animate(
            withDuration: 0.3,
            animations: { overlay.alpha = 0 },
            completion: { _ in
                overlay.removeFromSuperview()
                self.splashOverlay = nil
            }
        )
    }
}

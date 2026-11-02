import UIKit
import Capacitor
import WebKit

/// ViewController principal — étend CAPBridgeViewController et ajoute :
/// 1. Un overlay splash (icône centrée + 3 points orange animés)
/// 2. Auto-hide de l'overlay quand la WebView a fini de charger l'URL distante
/// 3. Status bar adaptative selon le thème courant (système iOS + thème de la page web)
///
/// IMPORTANT : on ne touche PAS au fond de la WebView (backgroundColor, scrollView).
/// La page web gère son propre rendu via CSS. Toucher au fond de la WebView cassait
/// les éléments transparents comme la navbar (visibles seulement parce qu'ils
/// s'appuient sur le fond géré par le site).
class MainViewController: CAPBridgeViewController, WKScriptMessageHandler {

    private static let splashMaxTimeout: TimeInterval = 30.0
    private static let pollInterval: TimeInterval = 0.25
    // URL persistence — restore last visited page if app was killed in background.
    // PAS d'expiration : on restaure toujours. L'app web gère elle-même les
    // redirections auth si le token est expiré.
    private static let lastUrlKey = "MonToitLastUrl"
    /// Heuristique JS qui retourne true quand la page SPA est "visuellement prête" :
    /// document complet, body avec enfants ET hauteur > 100px.
    private static let contentReadyJS = """
    (function(){try{return document.readyState==='complete' && document.body && document.body.children.length > 0 && document.body.offsetHeight > 100;}catch(e){return false;}})()
    """
    private static let dotColor = UIColor(red: 249/255, green: 115/255, blue: 22/255, alpha: 1.0) // #F97316
    private static let lightBackground = UIColor.white
    private static let darkBackground = UIColor(red: 17/255, green: 24/255, blue: 39/255, alpha: 1.0) // gray-900 Tailwind

    private var splashOverlay: UIView?
    private var statusBarOverlay: UIView?
    private var progressObservation: NSKeyValueObservation?
    private var timeoutWorkItem: DispatchWorkItem?
    private var splashHidden = false
    private var isDarkMode: Bool = false

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        isDarkMode = (traitCollection.userInterfaceStyle == .dark)
        view.backgroundColor = currentBackground
        injectThemeWatcher()
        addStatusBarOverlay()
        showSplashOverlay()
        observeWebViewProgress()
        setNeedsStatusBarAppearanceUpdate()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(saveCurrentUrl),
            name: UIApplication.willResignActiveNotification,
            object: nil
        )
        restoreLastUrlIfNeeded()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    /// Sauvegarde l'URL actuelle dans UserDefaults — appelée quand l'app
    /// passe en arrière-plan, pour pouvoir restaurer la page si iOS tue
    /// ensuite le process (memory pressure).
    @objc private func saveCurrentUrl() {
        guard let urlString = bridge?.webView?.url?.absoluteString,
              !urlString.isEmpty, urlString != "about:blank" else { return }
        UserDefaults.standard.set(urlString, forKey: MainViewController.lastUrlKey)
    }

    /// Au démarrage, restaure systématiquement la dernière URL visitée.
    /// Le splash overlay couvre tout pendant le chargement → pas de flash de la home.
    private func restoreLastUrlIfNeeded() {
        guard let savedUrl = UserDefaults.standard.string(forKey: MainViewController.lastUrlKey),
              let url = URL(string: savedUrl) else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
            self?.bridge?.webView?.load(URLRequest(url: url))
        }
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
    /// - view.backgroundColor (visible dans la zone safe-area autour de la WebView)
    /// - splashOverlay.backgroundColor (si l'overlay est encore visible)
    /// - la status bar (via preferredStatusBarStyle)
    /// Ne touche JAMAIS au fond de la WebView ou de son scrollView — c'est la page
    /// web qui gère ça via CSS.
    /// Met à jour le thème natif. Si `webBg` est fourni, c'est la couleur exacte du
    /// <body> de l'app web : elle est utilisée pour l'overlay status bar (alignement
    /// parfait visuel). Sinon, fallback vers nos couleurs prédéfinies.
    private func setDarkMode(_ dark: Bool, webBg: UIColor? = nil) {
        let nativeBg = dark ? MainViewController.darkBackground : MainViewController.lightBackground
        let overlayBg = webBg ?? nativeBg

        if dark != isDarkMode {
            isDarkMode = dark
            view.backgroundColor = nativeBg
            splashOverlay?.backgroundColor = nativeBg
            setNeedsStatusBarAppearanceUpdate()
        }
        // Le status bar overlay suit TOUJOURS la couleur exacte du body web
        // (même si le mode n'a pas changé — la couleur peut varier finement)
        statusBarOverlay?.backgroundColor = overlayBg
    }

    /// Ajoute un overlay natif uniquement dans la zone safe-area top
    /// (derrière les icônes système). Adopte la couleur du thème courant.
    /// Posé au-dessus de la WebView en z-order pour masquer le fond blanc
    /// statique de la navbar web dans cette zone, sans toucher au logo
    /// (qui se trouve dessous, dans la zone safe-area inférieure du device).
    private func addStatusBarOverlay() {
        let overlay = UIView()
        overlay.translatesAutoresizingMaskIntoConstraints = false
        overlay.isUserInteractionEnabled = false
        overlay.backgroundColor = currentBackground
        view.addSubview(overlay)

        NSLayoutConstraint.activate([
            overlay.topAnchor.constraint(equalTo: view.topAnchor),
            overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlay.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
        ])
        statusBarOverlay = overlay
    }

    /// Injecte un script qui :
    /// 1. Lit la couleur de fond RÉELLE du <body> (peu importe le mécanisme dark mode :
    ///    Tailwind class, data-theme, CSS variables, prefers-color-scheme…)
    /// 2. Calcule la luminance pour déterminer dark/light
    /// 3. Transmet la couleur exacte au natif → l'overlay status bar peut s'aligner
    ///    parfaitement avec le fond de l'app web
    /// 4. Re-détecte sur tout changement DOM (mutations, navigation SPA, prefers-color-scheme)
    private func injectThemeWatcher() {
        guard let webView = bridge?.webView else { return }
        let controller = webView.configuration.userContentController
        controller.add(self, name: "themeChanged")

        let script = """
        (function() {
            function getBodyBg() {
                var el = document.body || document.documentElement;
                var color = window.getComputedStyle(el).backgroundColor;
                // Si le body est transparent, remonter à <html>
                if (color === 'rgba(0, 0, 0, 0)' || color === 'transparent') {
                    color = window.getComputedStyle(document.documentElement).backgroundColor;
                }
                return color;
            }
            function detect() {
                var bg = getBodyBg();
                var m = bg.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
                var isDark = false;
                if (m) {
                    var r = +m[1], g = +m[2], b = +m[3];
                    var luminance = 0.299*r + 0.587*g + 0.114*b;
                    isDark = luminance < 128;
                }
                try {
                    window.webkit.messageHandlers.themeChanged.postMessage({
                        dark: isDark,
                        bgColor: bg
                    });
                } catch (e) {}
            }
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', detect);
            } else {
                detect();
            }
            // Mutations DOM (Tailwind toggle, data-theme, ajout/retrait de classes)
            new MutationObserver(detect).observe(document.documentElement, {
                attributes: true, attributeFilter: ['class', 'style', 'data-theme']
            });
            if (document.body) {
                new MutationObserver(detect).observe(document.body, {
                    attributes: true, attributeFilter: ['class', 'style', 'data-theme']
                });
            }
            // Changement de mode système (prefers-color-scheme)
            if (window.matchMedia) {
                try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', detect); } catch (e) {}
            }
            // Poll de sécurité (variables CSS, SPA navigation, etc.)
            setInterval(detect, 1500);
        })();
        """
        let userScript = WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        controller.addUserScript(userScript)
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "themeChanged",
              let body = message.body as? [String: Any] else { return }
        let dark = body["dark"] as? Bool ?? false
        let bgColor = (body["bgColor"] as? String).flatMap { MainViewController.uiColor(fromCSS: $0) }
        DispatchQueue.main.async {
            self.setDarkMode(dark, webBg: bgColor)
        }
    }

    /// Parse "rgb(r, g, b)" ou "rgba(r, g, b, a)" en UIColor.
    private static func uiColor(fromCSS css: String) -> UIColor? {
        let pattern = "rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([0-9.]+))?\\)"
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let m = regex.firstMatch(in: css, range: NSRange(css.startIndex..., in: css)) else { return nil }
        func intAt(_ idx: Int) -> Int? {
            guard let r = Range(m.range(at: idx), in: css) else { return nil }
            return Int(css[r])
        }
        guard let r = intAt(1), let g = intAt(2), let b = intAt(3) else { return nil }
        var a: CGFloat = 1.0
        if let aRange = Range(m.range(at: 4), in: css), let aVal = Double(css[aRange]) { a = CGFloat(aVal) }
        return UIColor(red: CGFloat(r)/255, green: CGFloat(g)/255, blue: CGFloat(b)/255, alpha: a)
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
                DispatchQueue.main.async { self.checkContentRendered() }
            }
        }
    }

    /// Vérifie que le contenu de la page est RENDU côté DOM, pas juste téléchargé.
    /// Pour un SPA Next.js, estimatedProgress=1.0 arrive avant que React n'ait
    /// hydraté → on poll le DOM jusqu'à voir du contenu (sinon écran blanc 30s).
    private func checkContentRendered() {
        guard !splashHidden, let webView = bridge?.webView else { return }
        webView.evaluateJavaScript(MainViewController.contentReadyJS) { [weak self] result, _ in
            guard let self = self, !self.splashHidden else { return }
            if let ready = result as? Bool, ready {
                DispatchQueue.main.async { self.hideSplashOverlay() }
            } else {
                DispatchQueue.main.asyncAfter(deadline: .now() + MainViewController.pollInterval) {
                    self.checkContentRendered()
                }
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

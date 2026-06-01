import UIKit
import Capacitor
import WebKit

/// ViewController principal — étend CAPBridgeViewController et ajoute :
/// 1. Un overlay splash (icône centrée + 3 points orange animés)
/// 2. Auto-hide de l'overlay quand la WebView a fini de charger l'URL distante
/// Équivalent iOS de MainActivity.java côté Android.
class MainViewController: CAPBridgeViewController {

    private static let splashMaxTimeout: TimeInterval = 15.0
    private static let dotColor = UIColor(red: 249/255, green: 115/255, blue: 22/255, alpha: 1.0) // #F97316
    private static let backgroundColor = UIColor.white

    private var splashOverlay: UIView?
    private var progressObservation: NSKeyValueObservation?
    private var timeoutWorkItem: DispatchWorkItem?
    private var splashHidden = false

    override func viewDidLoad() {
        super.viewDidLoad()
        // Fond blanc persistant du root view : visible au-dessus de la WebView
        // (dans la zone safe-area top sous la status bar) → évite que le contenu
        // de la WebView déborde derrière la barre de tâche.
        view.backgroundColor = MainViewController.backgroundColor
        constrainWebViewToSafeArea()
        showSplashOverlay()
        observeWebViewProgress()
    }

    /// Force la WebView à rester strictement dans la safe-area (sous la status bar).
    /// Sans ça, par défaut la WebView va edge-to-edge et le contenu web (cards, images)
    /// peut apparaître par transparence dans la zone safe-area top → effet de "strip
    /// coloré au-dessus du header" visible au scroll.
    private func constrainWebViewToSafeArea() {
        guard let webView = bridge?.webView else { return }

        webView.isOpaque = true
        webView.backgroundColor = MainViewController.backgroundColor
        webView.scrollView.backgroundColor = MainViewController.backgroundColor
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        webView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
        ])
    }

    /// Force les icônes système (heure, batterie, réseau) en mode foncé pour
    /// qu'elles restent visibles sur notre fond blanc.
    override var preferredStatusBarStyle: UIStatusBarStyle {
        if #available(iOS 13.0, *) {
            return .darkContent
        } else {
            return .default
        }
    }

    // MARK: - Splash overlay

    private func showSplashOverlay() {
        let overlay = UIView(frame: view.bounds)
        overlay.backgroundColor = MainViewController.backgroundColor
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

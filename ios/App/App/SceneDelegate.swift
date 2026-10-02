import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        // 爆踊の画面（CAPBridgeViewController）を黒い土台の上に置き、上端をカメラ・時計の部分の
        // すぐ下にそろえる。画面全体のスクロールを止めているため、こうしないと画面がカメラの下に潜り込む。
        // 下端はホームバーの部分まで使う（下のナビの余白はWeb側で取っている）
        let bridgeViewController = CAPBridgeViewController()
        let rootViewController = UIViewController()
        rootViewController.view.backgroundColor = .black
        rootViewController.addChild(bridgeViewController)
        rootViewController.view.addSubview(bridgeViewController.view)
        bridgeViewController.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            bridgeViewController.view.topAnchor.constraint(equalTo: rootViewController.view.safeAreaLayoutGuide.topAnchor),
            bridgeViewController.view.bottomAnchor.constraint(equalTo: rootViewController.view.bottomAnchor),
            bridgeViewController.view.leadingAnchor.constraint(equalTo: rootViewController.view.leadingAnchor),
            bridgeViewController.view.trailingAnchor.constraint(equalTo: rootViewController.view.trailingAnchor),
        ])
        bridgeViewController.didMove(toParent: rootViewController)
        window?.rootViewController = rootViewController
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

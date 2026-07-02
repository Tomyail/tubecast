import UIKit
import os
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
  private let logger = Logger(subsystem: "com.tomyail.tubecast.ShareExtension", category: "ShareExtension")
  private let appGroupIdentifier = "group.com.tomyail.tubecast"
  private let pendingOpenUrlKey = "TubeCastPendingOpenUrl"
  private let statusLabel = UILabel()
  private let actionButton = UIButton(type: .system)
  private let copyLogButton = UIButton(type: .system)
  private let debugTextView = UITextView()
  private var debugLines: [String] = []
  private var pendingOpenUrl: URL?

  override func viewDidLoad() {
    super.viewDidLoad()
    appendDebugLog("viewDidLoad")
    configureView()
    resolveSharedUrl()
  }

  private func configureView() {
    view.backgroundColor = .systemBackground

    statusLabel.font = .preferredFont(forTextStyle: .body)
    statusLabel.adjustsFontForContentSizeCategory = true
    statusLabel.numberOfLines = 0
    statusLabel.textAlignment = .center
    statusLabel.textColor = .secondaryLabel
    statusLabel.text = "Opening TubeCast..."

    actionButton.titleLabel?.font = .preferredFont(forTextStyle: .headline)
    actionButton.addTarget(self, action: #selector(actionButtonTapped), for: .touchUpInside)
    actionButton.isHidden = true

    copyLogButton.titleLabel?.font = .preferredFont(forTextStyle: .subheadline)
    copyLogButton.setTitle("Copy Debug Log", for: .normal)
    copyLogButton.addTarget(self, action: #selector(copyLogButtonTapped), for: .touchUpInside)
    copyLogButton.isHidden = true

    debugTextView.font = .monospacedSystemFont(ofSize: 11, weight: .regular)
    debugTextView.isEditable = false
    debugTextView.isSelectable = true
    debugTextView.isScrollEnabled = true
    debugTextView.backgroundColor = .secondarySystemBackground
    debugTextView.layer.cornerRadius = 8
    debugTextView.textContainerInset = UIEdgeInsets(top: 8, left: 8, bottom: 8, right: 8)
    debugTextView.isHidden = true
    debugTextView.translatesAutoresizingMaskIntoConstraints = false

    let stack = UIStackView(arrangedSubviews: [statusLabel, actionButton, copyLogButton, debugTextView])
    stack.axis = .vertical
    stack.alignment = .center
    stack.spacing = 14
    stack.translatesAutoresizingMaskIntoConstraints = false

    view.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.leadingAnchor.constraint(greaterThanOrEqualTo: view.layoutMarginsGuide.leadingAnchor),
      stack.trailingAnchor.constraint(lessThanOrEqualTo: view.layoutMarginsGuide.trailingAnchor),
      stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
      statusLabel.widthAnchor.constraint(lessThanOrEqualTo: view.layoutMarginsGuide.widthAnchor),
      debugTextView.widthAnchor.constraint(equalTo: view.layoutMarginsGuide.widthAnchor),
      debugTextView.heightAnchor.constraint(equalToConstant: 180)
    ])
  }

  private func resolveSharedUrl() {
    guard let itemProviders = extensionContext?.inputItems
      .compactMap({ $0 as? NSExtensionItem })
      .flatMap({ $0.attachments ?? [] }),
      !itemProviders.isEmpty
    else {
      appendDebugLog("no input item providers")
      showUnsupportedLink()
      return
    }

    appendDebugLog("resolving shared URL from \(itemProviders.count) item provider(s)")
    loadFirstUrl(from: itemProviders) { [weak self] sharedUrl in
      DispatchQueue.main.async {
        guard let self else { return }
        self.appendDebugLog("resolved shared URL: \(sharedUrl?.absoluteString ?? "nil")")
        guard let sharedUrl, self.isSupportedYouTubeUrl(sharedUrl), let openUrl = self.buildTubeCastOpenUrl(sharedUrl) else {
          self.appendDebugLog("unsupported or invalid shared URL")
          self.showUnsupportedLink()
          return
        }

        self.pendingOpenUrl = openUrl
        self.appendDebugLog("built TubeCast URL: \(openUrl.absoluteString)")
        self.savePendingOpenUrl(openUrl)
        self.openTubeCast(openUrl)
      }
    }
  }

  private func loadFirstUrl(from itemProviders: [NSItemProvider], completion: @escaping (URL?) -> Void) {
    var remainingProviders = itemProviders

    func loadNext() {
      guard !remainingProviders.isEmpty else {
        completion(nil)
        return
      }

      let provider = remainingProviders.removeFirst()
      appendDebugLog("provider registered types: \(provider.registeredTypeIdentifiers.joined(separator: ","))")
      let typeIdentifier = preferredTypeIdentifier(from: provider)
      guard let typeIdentifier else {
        appendDebugLog("provider has no supported type, trying next")
        loadNext()
        return
      }

      appendDebugLog("loading provider type: \(typeIdentifier)")
      provider.loadItem(forTypeIdentifier: typeIdentifier, options: nil) { item, error in
        if let error {
          self.appendDebugLog("loadItem failed for \(typeIdentifier): \(error.localizedDescription)")
        } else {
          self.appendDebugLog("loaded item class: \(String(describing: item.map { type(of: $0) }))")
        }

        if let url = self.url(from: item) {
          self.appendDebugLog("extracted URL: \(url.absoluteString)")
          completion(url)
          return
        }
        self.appendDebugLog("item did not contain URL, trying next provider")
        loadNext()
      }
    }

    loadNext()
  }

  private func preferredTypeIdentifier(from provider: NSItemProvider) -> String? {
    let supportedTypes = [
      UTType.url.identifier,
      UTType.plainText.identifier,
      "public.text",
      "public.utf8-plain-text"
    ]

    return supportedTypes.first { provider.hasItemConformingToTypeIdentifier($0) }
  }

  private func url(from item: NSSecureCoding?) -> URL? {
    if let url = item as? URL {
      return url
    }
    if let nsUrl = item as? NSURL {
      return nsUrl as URL
    }
    if let text = item as? String {
      return firstUrl(in: text)
    }
    if let attributedText = item as? NSAttributedString {
      return firstUrl(in: attributedText.string)
    }
    if let data = item as? Data, let text = String(data: data, encoding: .utf8) {
      return firstUrl(in: text)
    }
    return nil
  }

  private func firstUrl(in text: String) -> URL? {
    let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
    if let directUrl = URL(string: trimmed), directUrl.scheme != nil {
      return directUrl
    }

    let pattern = #"https://[^\s<>"']+"#
    guard let match = trimmed.range(of: pattern, options: .regularExpression) else {
      return nil
    }

    return URL(string: String(trimmed[match]))
  }

  private func isSupportedYouTubeUrl(_ url: URL) -> Bool {
    guard url.scheme == "https" else { return false }
    let host = (url.host ?? "").lowercased()

    if host == "youtu.be" || host == "www.youtu.be" {
      return youtubeVideoId(from: url.path.split(separator: "/").first.map(String.init)) != nil
    }

    guard host == "youtube.com" || host == "www.youtube.com" || host == "m.youtube.com" || host == "music.youtube.com" else {
      return false
    }

    if url.path == "/watch" {
      let videoId = URLComponents(url: url, resolvingAgainstBaseURL: false)?
        .queryItems?
        .first(where: { $0.name == "v" })?
        .value
      return youtubeVideoId(from: videoId) != nil
    }

    if let pathMatch = url.path.range(of: #"^/(embed|shorts)/([A-Za-z0-9_-]{11})/?$"#, options: .regularExpression) {
      return pathMatch == url.path.startIndex..<url.path.endIndex
    }

    if url.path.range(of: #"^/channel/UC[\w-]{22}/?$"#, options: .regularExpression) != nil {
      return true
    }

    if url.path.range(of: #"^/@[\w.-]{1,100}/?$"#, options: .regularExpression) != nil {
      return true
    }

    return false
  }

  private func youtubeVideoId(from candidate: String?) -> String? {
    guard let candidate, candidate.range(of: #"^[A-Za-z0-9_-]{11}$"#, options: .regularExpression) != nil else {
      return nil
    }
    return candidate
  }

  private func buildTubeCastOpenUrl(_ sourceUrl: URL) -> URL? {
    let allowedCharacters = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
    guard let encodedSourceUrl = sourceUrl.absoluteString.addingPercentEncoding(withAllowedCharacters: allowedCharacters) else {
      return nil
    }
    return URL(string: "tubecast://open?url=\(encodedSourceUrl)")
  }

  private func openTubeCast(_ url: URL) {
    // Share Extensions cannot launch their containing app reliably via
    // `extensionContext.open(_:)` (iOS reports success=false). The
    // responder-chain `openURL:` traversal is the supported mechanism and must
    // run WHILE the extension is still alive — i.e. BEFORE completeRequest.
    // Order matters: perform openURL first, then complete the request.
    appendDebugLog("opening via responder chain: \(url.absoluteString)")
    openTubeCastFromResponderChain(url)
    appendDebugLog("completing extension request after responder-chain open")
    extensionContext?.completeRequest(returningItems: nil)
  }

  private func savePendingOpenUrl(_ url: URL) {
    guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else {
      appendDebugLog("failed to open app group defaults: \(appGroupIdentifier)")
      return
    }
    defaults.set(url.absoluteString, forKey: pendingOpenUrlKey)
    defaults.synchronize()
    appendDebugLog("saved pending URL to app group")
  }

  private func showOpenButton() {
    statusLabel.text = "Ready to open in TubeCast."
    actionButton.setTitle("Open in TubeCast", for: .normal)
    actionButton.isHidden = false
  }

  private func showUnsupportedLink() {
    statusLabel.text = "TubeCast supports YouTube video and channel links."
    actionButton.setTitle("Done", for: .normal)
    actionButton.isHidden = false
  }

  @objc private func actionButtonTapped() {
    appendDebugLog("action button tapped, has pending URL=\(pendingOpenUrl != nil)")
    if let pendingOpenUrl {
      UIPasteboard.general.string = debugLines.joined(separator: "\n")
      statusLabel.text = "Opening TubeCast..."
      openTubeCast(pendingOpenUrl)
    } else {
      extensionContext?.completeRequest(returningItems: nil)
    }
  }

  @objc private func copyLogButtonTapped() {
    UIPasteboard.general.string = debugLines.joined(separator: "\n")
    appendDebugLog("debug log copied")
    copyLogButton.setTitle("Copied", for: .normal)
  }

  private func openTubeCastFromResponderChain(_ url: URL) {
    let selector = NSSelectorFromString("openURL:")
    var responder: UIResponder? = self

    appendDebugLog("responder-chain open start: \(url.absoluteString)")
    while let currentResponder = responder {
      appendDebugLog("checking responder: \(String(describing: type(of: currentResponder)))")
      if currentResponder.responds(to: selector) {
        appendDebugLog("responder handles openURL: \(String(describing: type(of: currentResponder)))")
        _ = currentResponder.perform(selector, with: url)
        return
      }
      responder = currentResponder.next
    }

    appendDebugLog("no responder handled openURL")
    showOpenButton()
  }

  private func appendDebugLog(_ message: String) {
    let line = "[TubeCastShareExtension] \(message)"
    logger.info("\(line, privacy: .public)")
    debugLines.append(line)

    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.debugTextView.text = self.debugLines.joined(separator: "\n")
      self.debugTextView.isHidden = false
      self.copyLogButton.isHidden = false

      let bottom = NSRange(location: max(self.debugTextView.text.count - 1, 0), length: 1)
      self.debugTextView.scrollRangeToVisible(bottom)
    }
  }
}

#!/usr/bin/env swift

import AppKit
import Foundation

private struct Copy {
  let title: String
  let subtitle: String
}

private struct LocaleSet {
  let code: String
  let sourceLocale: String
  let date: String
  let trackTitle: String
  let channel: String
  let slides: [Copy]
}

private let locales = [
  LocaleSet(
    code: "en-US",
    sourceLocale: "en-US",
    date: "Sunday, August 2",
    trackTitle: "Morning Reset: A Calm Start",
    channel: "Calm Living",
    slides: [
      Copy(title: "Turn videos into audio", subtitle: "Listen during commutes, workouts, and daily routines"),
      Copy(title: "Discover something worth hearing", subtitle: "Curated long-form picks, ready to add and listen"),
      Copy(title: "Follow channels. Hear every update.", subtitle: "A podcast-style feed for long-form content"),
      Copy(title: "Build your offline listening library", subtitle: "Keep your progress and listen anywhere"),
      Copy(title: "Background playback with Lock Screen controls", subtitle: "Keep listening without keeping the app open"),
    ]
  ),
  LocaleSet(
    code: "zh-Hans",
    sourceLocale: "zh-Hans",
    date: "8月2日 星期日",
    trackTitle: "放松心情：自然风光治愈之旅",
    channel: "精选频道",
    slides: [
      Copy(title: "把长视频，变成随身音频", subtitle: "通勤、运动、做家务时继续听"),
      Copy(title: "发现值得一听的长内容", subtitle: "精选推荐集中呈现，看到就能加入收听"),
      Copy(title: "关注频道，像追播客一样听更新", subtitle: "新内容集中呈现，一键加入收听列表"),
      Copy(title: "建立你的离线收听资料库", subtitle: "保留播放进度，没有网络也能继续听"),
      Copy(title: "后台播放，锁屏也能控制", subtitle: "手机放进口袋，专注收听"),
    ]
  ),
  LocaleSet(
    code: "zh-Hant",
    sourceLocale: "en-US",
    date: "8月2日 星期日",
    trackTitle: "晨間重啟：平靜的開始",
    channel: "慢活選輯",
    slides: [
      Copy(title: "把長影片，變成隨身音訊", subtitle: "通勤、運動、做家事時繼續聽"),
      Copy(title: "探索值得一聽的長內容", subtitle: "精選推薦集中呈現，看到就能加入收聽"),
      Copy(title: "追蹤頻道，像 Podcast 一樣聽更新", subtitle: "新內容集中呈現，一鍵加入收聽列表"),
      Copy(title: "建立你的離線收聽資料庫", subtitle: "保留播放進度，沒有網路也能繼續聽"),
      Copy(title: "背景播放，鎖定畫面也能控制", subtitle: "手機放進口袋，專注收聽"),
    ]
  ),
]

private let fileManager = FileManager.default
private let scriptURL = URL(fileURLWithPath: CommandLine.arguments[0]).standardizedFileURL
private let mobileRoot = scriptURL.deletingLastPathComponent().deletingLastPathComponent()
private let sourceRoot = mobileRoot.appendingPathComponent("screenshot-assets/store-ui")
private let outputRoot = mobileRoot.appendingPathComponent("fastlane/screenshots")
private let artworkURL = mobileRoot.appendingPathComponent("screenshot-assets/demo-covers/lake-reading.png")

private let background = NSColor(calibratedRed: 0.965, green: 0.941, blue: 0.905, alpha: 1)
private let ink = NSColor(calibratedRed: 0.105, green: 0.086, blue: 0.073, alpha: 1)
private let secondaryInk = NSColor(calibratedRed: 0.37, green: 0.32, blue: 0.28, alpha: 1)
private let accent = NSColor(calibratedRed: 0.76, green: 0.31, blue: 0.15, alpha: 1)

private func font(_ size: CGFloat, weight: NSFont.Weight) -> NSFont {
  NSFont.systemFont(ofSize: size, weight: weight)
}

private func drawText(
  _ value: String,
  in rect: NSRect,
  font: NSFont,
  color: NSColor,
  alignment: NSTextAlignment = .center,
  lineSpacing: CGFloat = 0
) {
  let paragraph = NSMutableParagraphStyle()
  paragraph.alignment = alignment
  paragraph.lineBreakMode = .byWordWrapping
  paragraph.lineSpacing = lineSpacing
  let attributes: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: color,
    .paragraphStyle: paragraph,
  ]
  (value as NSString).draw(in: rect, withAttributes: attributes)
}

private func roundedClip(_ rect: NSRect, radius: CGFloat, draw: () -> Void) {
  NSGraphicsContext.saveGraphicsState()
  NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).addClip()
  draw()
  NSGraphicsContext.restoreGraphicsState()
}

private func drawImage(_ image: NSImage, in destination: NSRect, from source: NSRect, opacity: CGFloat = 1) {
  // `NSImage(size:flipped:drawingHandler:)` gives text a convenient top-left
  // coordinate system, while NSImage bitmap drawing still expects an unflipped
  // destination. Flip only the bitmap around its own destination rect.
  NSGraphicsContext.saveGraphicsState()
  let context = NSGraphicsContext.current!.cgContext
  context.translateBy(x: 0, y: destination.minY * 2 + destination.height)
  context.scaleBy(x: 1, y: -1)
  image.draw(in: destination, from: source, operation: .sourceOver, fraction: opacity)
  NSGraphicsContext.restoreGraphicsState()
}

private func drawAspectFill(_ image: NSImage, in rect: NSRect, opacity: CGFloat = 1) {
  let imageSize = image.size
  let scale = max(rect.width / imageSize.width, rect.height / imageSize.height)
  let sourceSize = NSSize(width: rect.width / scale, height: rect.height / scale)
  let sourceRect = NSRect(
    x: (imageSize.width - sourceSize.width) / 2,
    y: (imageSize.height - sourceSize.height) / 2,
    width: sourceSize.width,
    height: sourceSize.height
  )
  drawImage(image, in: rect, from: sourceRect, opacity: opacity)
}

private func drawDevice(source: NSImage, canvas: NSSize, top: CGFloat) {
  let isPhone = canvas.width < 1500
  let outerWidth = canvas.width * (isPhone ? 0.72 : 0.84)
  let outerHeight = outerWidth * source.size.height / source.size.width
  let outerRect = NSRect(x: (canvas.width - outerWidth) / 2, y: top, width: outerWidth, height: outerHeight)
  let border = isPhone ? 22.0 : 18.0
  let radius = isPhone ? 104.0 : 58.0

  if isPhone {
    // Visible hardware controls make the silhouette read immediately as an
    // iPhone, even at App Store search-result thumbnail size.
    let hardware = NSColor(calibratedWhite: 0.18, alpha: 1)
    hardware.setFill()
    NSBezierPath(roundedRect: NSRect(x: outerRect.minX - 10, y: outerRect.minY + 300, width: 14, height: 112), xRadius: 7, yRadius: 7).fill()
    NSBezierPath(roundedRect: NSRect(x: outerRect.minX - 10, y: outerRect.minY + 450, width: 14, height: 190), xRadius: 7, yRadius: 7).fill()
    NSBezierPath(roundedRect: NSRect(x: outerRect.maxX - 4, y: outerRect.minY + 390, width: 14, height: 250), xRadius: 7, yRadius: 7).fill()
  }

  let shadow = NSShadow()
  shadow.shadowColor = NSColor.black.withAlphaComponent(0.18)
  shadow.shadowBlurRadius = isPhone ? 42 : 54
  shadow.shadowOffset = NSSize(width: 0, height: -18)
  shadow.set()
  NSColor(calibratedWhite: isPhone ? 0.10 : 0.08, alpha: 1).setFill()
  NSBezierPath(roundedRect: outerRect, xRadius: radius, yRadius: radius).fill()
  if isPhone {
    NSColor.white.withAlphaComponent(0.16).setStroke()
    let highlight = NSBezierPath(roundedRect: outerRect.insetBy(dx: 3, dy: 3), xRadius: radius - 3, yRadius: radius - 3)
    highlight.lineWidth = 3
    highlight.stroke()
  }
  NSGraphicsContext.current?.cgContext.setShadow(offset: .zero, blur: 0, color: nil)

  let screenRect = outerRect.insetBy(dx: border, dy: border)
  roundedClip(screenRect, radius: radius - border) {
    drawImage(source, in: screenRect, from: .zero)
  }

  if isPhone {
    let islandWidth = outerWidth * 0.27
    let islandHeight: CGFloat = 52
    let islandRect = NSRect(x: outerRect.midX - islandWidth / 2, y: screenRect.minY + 22, width: islandWidth, height: islandHeight)
    NSColor.black.setFill()
    NSBezierPath(roundedRect: islandRect, xRadius: islandHeight / 2, yRadius: islandHeight / 2).fill()

    let homeWidth = outerWidth * 0.31
    let homeRect = NSRect(x: outerRect.midX - homeWidth / 2, y: screenRect.maxY - 30, width: homeWidth, height: 9)
    NSColor.black.withAlphaComponent(0.88).setFill()
    NSBezierPath(roundedRect: homeRect, xRadius: 5, yRadius: 5).fill()
  }
}

private func marketingCanvas(source: NSImage, copy: Copy, slide: Int, size: NSSize) -> NSImage {
  let isPhone = size.width < 1500
  return NSImage(size: size, flipped: true) { rect in
    background.setFill()
    rect.fill()

    let glowRect = NSRect(x: -size.width * 0.18, y: size.height * 0.12, width: size.width * 0.7, height: size.width * 0.7)
    NSColor(calibratedRed: 0.96, green: 0.69, blue: 0.49, alpha: 0.18).setFill()
    NSBezierPath(ovalIn: glowRect).fill()

    drawText(
      "TUBECAST  ·  0\(slide + 1)",
      in: NSRect(x: size.width * 0.08, y: isPhone ? 90 : 78, width: size.width * 0.84, height: 48),
      font: font(isPhone ? 28 : 30, weight: .semibold),
      color: accent
    )

    drawText(
      copy.title,
      in: NSRect(x: size.width * 0.07, y: isPhone ? 154 : 140, width: size.width * 0.86, height: isPhone ? 196 : 180),
      font: font(isPhone ? 66 : 76, weight: .bold),
      color: ink,
      lineSpacing: isPhone ? 4 : 6
    )
    drawText(
      copy.subtitle,
      in: NSRect(x: size.width * 0.06, y: isPhone ? 375 : 342, width: size.width * 0.88, height: 78),
      font: font(isPhone ? 35 : 38, weight: .medium),
      color: secondaryInk
    )

    drawDevice(source: source, canvas: size, top: isPhone ? 550 : 510)
    return true
  }
}

private func drawPause(center: NSPoint, size: CGFloat, color: NSColor) {
  color.setFill()
  let width = size * 0.19
  let height = size * 0.46
  NSBezierPath(roundedRect: NSRect(x: center.x - width * 1.45, y: center.y - height / 2, width: width, height: height), xRadius: width * 0.25, yRadius: width * 0.25).fill()
  NSBezierPath(roundedRect: NSRect(x: center.x + width * 0.45, y: center.y - height / 2, width: width, height: height), xRadius: width * 0.25, yRadius: width * 0.25).fill()
}

private func drawSkip(center: NSPoint, size: CGFloat, backwards: Bool, color: NSColor) {
  color.setFill()
  let direction: CGFloat = backwards ? -1 : 1
  let path = NSBezierPath()
  path.move(to: NSPoint(x: center.x + direction * size * 0.30, y: center.y - size * 0.29))
  path.line(to: NSPoint(x: center.x - direction * size * 0.10, y: center.y))
  path.line(to: NSPoint(x: center.x + direction * size * 0.30, y: center.y + size * 0.29))
  path.close()
  path.fill()
  NSBezierPath(roundedRect: NSRect(x: center.x - direction * size * 0.31 - (backwards ? 0 : size * 0.07), y: center.y - size * 0.31, width: size * 0.07, height: size * 0.62), xRadius: 3, yRadius: 3).fill()
}

private func lockScreen(locale: LocaleSet, size: NSSize) throws -> NSImage {
  guard let artwork = NSImage(contentsOf: artworkURL) else {
    throw NSError(domain: "StoreScreenshots", code: 2, userInfo: [NSLocalizedDescriptionKey: "Missing artwork: \(artworkURL.path)"])
  }
  let isPhone = size.width < 1500
  return NSImage(size: size, flipped: true) { rect in
    drawAspectFill(artwork, in: rect)
    NSColor(calibratedWhite: 0.02, alpha: 0.45).setFill()
    rect.fill()

    drawText(locale.date, in: NSRect(x: 0, y: isPhone ? 126 : 54, width: size.width, height: 70), font: font(isPhone ? 34 : 30, weight: .semibold), color: .white)
    drawText("9:41", in: NSRect(x: 0, y: isPhone ? 176 : 104, width: size.width, height: isPhone ? 190 : 170), font: font(isPhone ? 142 : 128, weight: .thin), color: .white)

    let artWidth = size.width * (isPhone ? 0.67 : 0.40)
    let artRect = NSRect(x: (size.width - artWidth) / 2, y: isPhone ? 570 : 430, width: artWidth, height: artWidth)
    let shadow = NSShadow()
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.34)
    shadow.shadowBlurRadius = 42
    shadow.shadowOffset = NSSize(width: 0, height: -18)
    shadow.set()
    roundedClip(artRect, radius: isPhone ? 42 : 34) { drawAspectFill(artwork, in: artRect) }
    NSGraphicsContext.current?.cgContext.setShadow(offset: .zero, blur: 0, color: nil)

    let infoTop = artRect.maxY + (isPhone ? 100 : 76)
    drawText(locale.trackTitle, in: NSRect(x: size.width * 0.16, y: infoTop, width: size.width * 0.68, height: 92), font: font(isPhone ? 44 : 42, weight: .semibold), color: .white, alignment: .left)
    drawText(locale.channel, in: NSRect(x: size.width * 0.16, y: infoTop + 72, width: size.width * 0.68, height: 62), font: font(isPhone ? 34 : 31, weight: .regular), color: NSColor.white.withAlphaComponent(0.72), alignment: .left)

    let sliderY = infoTop + (isPhone ? 194 : 174)
    let sliderRect = NSRect(x: size.width * 0.16, y: sliderY, width: size.width * 0.68, height: 10)
    NSColor.white.withAlphaComponent(0.35).setFill()
    NSBezierPath(roundedRect: sliderRect, xRadius: 5, yRadius: 5).fill()
    let progressRect = NSRect(x: sliderRect.minX, y: sliderRect.minY, width: sliderRect.width * 0.34, height: sliderRect.height)
    NSColor.white.withAlphaComponent(0.92).setFill()
    NSBezierPath(roundedRect: progressRect, xRadius: 5, yRadius: 5).fill()
    drawText("7:02", in: NSRect(x: sliderRect.minX, y: sliderY + 26, width: 120, height: 50), font: font(isPhone ? 25 : 23, weight: .medium), color: NSColor.white.withAlphaComponent(0.72), alignment: .left)
    drawText("−13:32", in: NSRect(x: sliderRect.maxX - 140, y: sliderY + 26, width: 140, height: 50), font: font(isPhone ? 25 : 23, weight: .medium), color: NSColor.white.withAlphaComponent(0.72), alignment: .right)

    let controlsY = sliderY + (isPhone ? 190 : 170)
    drawSkip(center: NSPoint(x: size.width * 0.31, y: controlsY), size: isPhone ? 100 : 92, backwards: true, color: .white)
    drawPause(center: NSPoint(x: size.width * 0.50, y: controlsY), size: isPhone ? 112 : 104, color: .white)
    drawSkip(center: NSPoint(x: size.width * 0.69, y: controlsY), size: isPhone ? 100 : 92, backwards: false, color: .white)

    let pillRect = NSRect(x: size.width * 0.30, y: controlsY + (isPhone ? 155 : 138), width: size.width * 0.40, height: isPhone ? 92 : 82)
    NSColor.white.withAlphaComponent(0.15).setFill()
    NSBezierPath(roundedRect: pillRect, xRadius: pillRect.height / 2, yRadius: pillRect.height / 2).fill()
    drawText("TUBECAST  ·  AIRPLAY", in: NSRect(x: pillRect.minX, y: pillRect.minY + pillRect.height * 0.28, width: pillRect.width, height: 42), font: font(isPhone ? 24 : 22, weight: .semibold), color: NSColor.white.withAlphaComponent(0.88))
    return true
  }
}

private func writePNG(_ image: NSImage, to url: URL) throws {
  guard let representation = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(image.size.width),
    pixelsHigh: Int(image.size.height),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  ), let context = NSGraphicsContext(bitmapImageRep: representation) else {
    throw NSError(domain: "StoreScreenshots", code: 3, userInfo: [NSLocalizedDescriptionKey: "Could not create PNG bitmap"])
  }

  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = context
  image.draw(in: NSRect(origin: .zero, size: image.size))
  NSGraphicsContext.restoreGraphicsState()

  guard let data = representation.representation(using: .png, properties: [.compressionFactor: 0.92]) else {
    throw NSError(domain: "StoreScreenshots", code: 4, userInfo: [NSLocalizedDescriptionKey: "Could not encode PNG"])
  }
  try data.write(to: url, options: .atomic)
}

private func sourceURL(locale: LocaleSet, slide: Int, device: String) -> URL {
  sourceRoot
    .appendingPathComponent(locale.sourceLocale)
    .appendingPathComponent("\(slide)_\(device)_\(slide).png")
}

private func run() throws {
  let devices: [(name: String, size: NSSize)] = [
    ("APP_IPHONE_65", NSSize(width: 1284, height: 2778)),
    ("APP_IPAD_PRO_3GEN_129", NSSize(width: 2064, height: 2752)),
  ]

  for locale in locales {
    let localeOutput = outputRoot.appendingPathComponent(locale.code)
    try fileManager.createDirectory(at: localeOutput, withIntermediateDirectories: true)

    for (device, size) in devices {
      for slide in 0..<locale.slides.count {
        let inner: NSImage
        if slide == 4 {
          inner = try lockScreen(locale: locale, size: size)
        } else {
          let input = sourceURL(locale: locale, slide: slide, device: device)
          guard let source = NSImage(contentsOf: input) else {
            throw NSError(domain: "StoreScreenshots", code: 1, userInfo: [NSLocalizedDescriptionKey: "Missing source screenshot: \(input.path)"])
          }
          inner = source
        }

        let final = marketingCanvas(source: inner, copy: locale.slides[slide], slide: slide, size: size)
        let output = localeOutput.appendingPathComponent("\(slide)_\(device)_\(slide).png")
        try writePNG(final, to: output)
        print("Generated \(output.path)")
      }
    }
  }
}

do {
  try run()
} catch {
  fputs("error: \(error.localizedDescription)\n", stderr)
  exit(1)
}

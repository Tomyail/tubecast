const fs = require("node:fs");
const path = require("node:path");
const { IOSConfig, withDangerousMod, withXcodeProject } = require("@expo/config-plugins");

const TARGET_NAME = "TubeCastShareExtension";
const TEMPLATE_DIR = "ios-share-extension";
const EXTENSION_DIR = TARGET_NAME;
const EXTENSION_BUNDLE_SUFFIX = "ShareExtension";
const APP_GROUP_IDENTIFIER = "group.com.tomyail.tubecast";

function copyDirectory(source, destination) {
  fs.rmSync(destination, { force: true, recursive: true });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

function entitlementsPlist(appGroupIdentifier) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.application-groups</key>
    <array>
      <string>${appGroupIdentifier}</string>
    </array>
  </dict>
</plist>
`;
}

function writeEntitlements(projectRoot) {
  fs.writeFileSync(
    path.join(projectRoot, "ios", "TubeCast", "TubeCast.entitlements"),
    entitlementsPlist(APP_GROUP_IDENTIFIER),
  );
  fs.writeFileSync(
    path.join(projectRoot, "ios", EXTENSION_DIR, `${TARGET_NAME}.entitlements`),
    entitlementsPlist(APP_GROUP_IDENTIFIER),
  );
}

function patchAppDelegate(projectRoot) {
  const appDelegatePath = path.join(projectRoot, "ios", "TubeCast", "AppDelegate.swift");
  let contents = fs.readFileSync(appDelegatePath, "utf8");
  if (contents.includes("tubeCastAppGroupIdentifier")) {
    return;
  }

  contents = contents.replace(
    "class AppDelegate: ExpoAppDelegate {\n",
    `class AppDelegate: ExpoAppDelegate {
  private let tubeCastAppGroupIdentifier = "${APP_GROUP_IDENTIFIER}"
  private let tubeCastPendingOpenUrlKey = "TubeCastPendingOpenUrl"

  private func consumeTubeCastPendingOpenUrl() -> URL? {
    guard let defaults = UserDefaults(suiteName: tubeCastAppGroupIdentifier),
          let rawUrl = defaults.string(forKey: tubeCastPendingOpenUrlKey),
          let url = URL(string: rawUrl) else {
      return nil
    }
    defaults.removeObject(forKey: tubeCastPendingOpenUrlKey)
    defaults.synchronize()
    return url
  }

`,
  );

  contents = contents.replace(
    "    reactNativeDelegate = delegate\n    reactNativeFactory = factory\n",
    `    reactNativeDelegate = delegate
    reactNativeFactory = factory

    var launchOptionsWithTubeCastShare = launchOptions
    if let pendingOpenUrl = consumeTubeCastPendingOpenUrl() {
      if launchOptionsWithTubeCastShare == nil {
        launchOptionsWithTubeCastShare = [:]
      }
      launchOptionsWithTubeCastShare?[.url] = pendingOpenUrl
      print("[TubeCastShareBridge] Injected pending URL into launch options: \\(pendingOpenUrl.absoluteString)")
    }
`,
  );

  contents = contents.replace(
    "      launchOptions: launchOptions)",
    "      launchOptions: launchOptionsWithTubeCastShare)",
  );
  contents = contents.replace(
    "    return super.application(application, didFinishLaunchingWithOptions: launchOptions)",
    "    return super.application(application, didFinishLaunchingWithOptions: launchOptionsWithTubeCastShare)",
  );

  contents = contents.replace(
    "    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)\n",
    `    // The URL was delivered directly (e.g. via the Share Extension's
    // responder-chain openURL), so drop any pending URL saved in the app group
    // to avoid applicationDidBecomeActive re-delivering it a second time.
    consumeTubeCastPendingOpenUrl()
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
`,
  );

  contents = contents.replace(
    "  // Universal Links\n",
    `  public override func applicationDidBecomeActive(_ application: UIApplication) {
    super.applicationDidBecomeActive(application)
    guard let pendingOpenUrl = consumeTubeCastPendingOpenUrl() else {
      return
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
      print("[TubeCastShareBridge] Dispatching pending URL after activation: \\(pendingOpenUrl.absoluteString)")
      _ = RCTLinkingManager.application(application, open: pendingOpenUrl, options: [:])
    }
  }

  // Universal Links
`,
  );

  fs.writeFileSync(appDelegatePath, contents);
}

function getTargetUuid(project, targetName) {
  const nativeTargets = project.pbxNativeTargetSection();
  for (const key of Object.keys(nativeTargets)) {
    if (key.endsWith("_comment")) continue;
    const target = nativeTargets[key];
    if (target.name === targetName || target.name === `"${targetName}"`) {
      return key;
    }
  }
  return null;
}

function getMainTargetBuildSetting(project, settingName) {
  const mainTarget = project.getFirstTarget();
  const configurationListId = mainTarget.firstTarget.buildConfigurationList;
  const configurationList = project.pbxXCConfigurationList()[configurationListId];
  const firstConfigurationId = configurationList?.buildConfigurations?.[0]?.value;
  if (!firstConfigurationId) return null;
  return project.pbxXCBuildConfigurationSection()[firstConfigurationId]?.buildSettings?.[settingName] ?? null;
}

function ensureTargetBuildPhase(project, targetUuid, buildPhaseType, comment) {
  const target = project.pbxNativeTargetSection()[targetUuid];
  const existingPhase = target.buildPhases?.find((phase) => phase.comment === comment);
  if (existingPhase) return existingPhase.value;

  return project.addBuildPhase([], buildPhaseType, comment, targetUuid).uuid;
}

function setTargetBuildProperty(project, targetUuid, property, value, buildName = null) {
  const target = project.pbxNativeTargetSection()[targetUuid];
  const configurationList = project.pbxXCConfigurationList()[target.buildConfigurationList];
  const configurations = project.pbxXCBuildConfigurationSection();

  for (const buildConfiguration of configurationList.buildConfigurations ?? []) {
    const configuration = configurations[buildConfiguration.value];
    if (!configuration || (buildName && configuration.name !== buildName)) continue;
    configuration.buildSettings[property] = value;
  }
}

function ensureShareExtensionTarget(project, bundleIdentifier, appVersion, buildNumber) {
  let targetUuid = getTargetUuid(project, TARGET_NAME);
  if (!targetUuid) {
    const target = project.addTarget(
      TARGET_NAME,
      "app_extension",
      EXTENSION_DIR,
      `${bundleIdentifier}.${EXTENSION_BUNDLE_SUFFIX}`,
    );
    targetUuid = target.uuid;
  }

  ensureTargetBuildPhase(project, targetUuid, "PBXSourcesBuildPhase", "Sources");
  ensureTargetBuildPhase(project, targetUuid, "PBXFrameworksBuildPhase", "Frameworks");
  ensureTargetBuildPhase(project, targetUuid, "PBXResourcesBuildPhase", "Resources");

  const group = IOSConfig.XcodeUtils.ensureGroupRecursively(project, EXTENSION_DIR);
  const groupKey = project.findPBXGroupKey({ name: group?.name ?? EXTENSION_DIR }) || project.findPBXGroupKey({ path: EXTENSION_DIR });
  if (groupKey) {
    project.addSourceFile(`${EXTENSION_DIR}/ShareViewController.swift`, { target: targetUuid }, groupKey);
  }

  const developmentTeam = getMainTargetBuildSetting(project, "DEVELOPMENT_TEAM");
  const currentProjectVersion = buildNumber || getMainTargetBuildSetting(project, "CURRENT_PROJECT_VERSION");
  const marketingVersion = appVersion || getMainTargetBuildSetting(project, "MARKETING_VERSION");
  const targetDeviceFamily = getMainTargetBuildSetting(project, "TARGETED_DEVICE_FAMILY");

  setTargetBuildProperty(project, targetUuid, "APPLICATION_EXTENSION_API_ONLY", "YES");
  setTargetBuildProperty(project, targetUuid, "CLANG_ENABLE_MODULES", "YES");
  setTargetBuildProperty(project, targetUuid, "CODE_SIGN_ENTITLEMENTS", `${EXTENSION_DIR}/${TARGET_NAME}.entitlements`);
  setTargetBuildProperty(project, targetUuid, "CODE_SIGN_STYLE", "Automatic");
  setTargetBuildProperty(project, targetUuid, "INFOPLIST_FILE", `${EXTENSION_DIR}/${TARGET_NAME}-Info.plist`);
  setTargetBuildProperty(project, targetUuid, "IPHONEOS_DEPLOYMENT_TARGET", "16.4");
  setTargetBuildProperty(project, targetUuid, "LD_RUNPATH_SEARCH_PATHS", [
    '"$(inherited)"',
    '"@executable_path/Frameworks"',
    '"@executable_path/../../Frameworks"',
  ]);
  setTargetBuildProperty(project, targetUuid, "PRODUCT_BUNDLE_IDENTIFIER", `${bundleIdentifier}.${EXTENSION_BUNDLE_SUFFIX}`);
  setTargetBuildProperty(project, targetUuid, "PRODUCT_NAME", TARGET_NAME);
  setTargetBuildProperty(project, targetUuid, "SKIP_INSTALL", "YES");
  setTargetBuildProperty(project, targetUuid, "SWIFT_VERSION", "5.0");
  setTargetBuildProperty(project, targetUuid, "VERSIONING_SYSTEM", "apple-generic");

  if (developmentTeam) setTargetBuildProperty(project, targetUuid, "DEVELOPMENT_TEAM", developmentTeam);
  if (currentProjectVersion) setTargetBuildProperty(project, targetUuid, "CURRENT_PROJECT_VERSION", currentProjectVersion);
  if (marketingVersion) setTargetBuildProperty(project, targetUuid, "MARKETING_VERSION", marketingVersion);
  if (targetDeviceFamily) setTargetBuildProperty(project, targetUuid, "TARGETED_DEVICE_FAMILY", targetDeviceFamily);
}

module.exports = function withShareExtension(config) {
  config = withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      copyDirectory(
        path.join(projectRoot, TEMPLATE_DIR),
        path.join(projectRoot, "ios", EXTENSION_DIR),
      );
      writeEntitlements(projectRoot);
      patchAppDelegate(projectRoot);
      return modConfig;
    },
  ]);

  return withXcodeProject(config, (modConfig) => {
    const bundleIdentifier = modConfig.ios?.bundleIdentifier;
    if (!bundleIdentifier) {
      throw new Error("withShareExtension requires expo.ios.bundleIdentifier.");
    }
    ensureShareExtensionTarget(
      modConfig.modResults,
      bundleIdentifier,
      modConfig.version,
      modConfig.ios?.buildNumber,
    );
    return modConfig;
  });
};

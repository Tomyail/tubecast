// Custom bump-file updater for commit-and-tag-version.
//
// 为什么需要它：.versionrc 里 `bumpFiles.data = { expo: { version: null } }` 的嵌套写法
// 在 CATV 12.7.3 里不按预期工作——它会在 app.json 根对象追加一个游离的顶层 `version`，
// 而不是写进 `expo.version`。自定义 updater 直接读写 `expo.version`，其余字段原样保留。
module.exports = {
  readVersion(contents) {
    return JSON.parse(contents).expo.version;
  },
  writeVersion(contents, version) {
    const json = JSON.parse(contents);
    json.expo.version = version;
    return JSON.stringify(json, null, 2) + "\n";
  },
};

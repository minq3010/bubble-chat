const assert = require("node:assert/strict");
const { compareVersions, selectAsset } = require("./update-utils.cjs");

assert.equal(compareVersions("v1.2.0", "1.1.9"), 1);
assert.equal(compareVersions("1.2.0", "v1.2.0"), 0);
assert.equal(compareVersions("1.2.0", "1.2.1"), -1);
assert.equal(compareVersions("v1.2", "1.2.0"), null);
assert.equal(
  selectAsset([{ name: "Bubble-Chat-1.2.0-mac-arm64.dmg", browser_download_url: "https://github.com/x" }], "darwin", "arm64")?.name,
  "Bubble-Chat-1.2.0-mac-arm64.dmg",
);
assert.equal(selectAsset([], "darwin", "x64"), undefined);

const assert = require("node:assert/strict")
const { compareVersions, selectAsset } = require("./update-utils.cjs")

assert.equal(compareVersions("v1.2.0", "1.1.9"), 1)
assert.equal(compareVersions("1.2.0", "v1.2.0"), 0)
assert.equal(compareVersions("1.2.0", "1.2.1"), -1)
assert.equal(compareVersions("v1.2", "1.2.0"), null)

// Linux deb (amd64 / x64)
assert.equal(
  selectAsset(
    [
      { name: "latest.yml", browser_download_url: "https://github.com/y" },
      {
        name: "Bubble-Chat-1.0.2-linux-amd64.deb",
        browser_download_url: "https://github.com/deb",
      },
    ],
    "linux",
    "x64",
  )?.name,
  "Bubble-Chat-1.0.2-linux-amd64.deb",
)

// Mac dmg (arm64)
assert.equal(
  selectAsset(
    [
      {
        name: "Bubble-Chat-1.2.0-mac-arm64.dmg",
        browser_download_url: "https://github.com/x",
      },
    ],
    "darwin",
    "arm64",
  )?.name,
  "Bubble-Chat-1.2.0-mac-arm64.dmg",
)

// Windows exe (x64)
assert.equal(
  selectAsset(
    [
      {
        name: "Bubble-Chat-1.0.2-win-x64.exe",
        browser_download_url: "https://github.com/w",
      },
    ],
    "win32",
    "x64",
  )?.name,
  "Bubble-Chat-1.0.2-win-x64.exe",
)

assert.equal(selectAsset([], "darwin", "x64"), undefined)

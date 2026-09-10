const ASSET_SUFFIX = {
  "darwin:arm64": "-mac-arm64.dmg",
  "win32:x64": "-win-x64.exe",
  "linux:x64": "-linux-x64.deb",
};

function versionParts(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version);
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  if (!a || !b) return null;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function selectAsset(assets, platform, arch) {
  const suffix = ASSET_SUFFIX[`${platform}:${arch}`];
  if (!suffix || !Array.isArray(assets)) return undefined;
  return assets.find((asset) =>
    typeof asset?.name === "string" &&
    typeof asset?.browser_download_url === "string" &&
    asset.name.toLowerCase().endsWith(suffix),
  );
}

module.exports = { compareVersions, selectAsset };

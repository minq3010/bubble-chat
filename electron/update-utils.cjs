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
  if (!Array.isArray(assets)) return undefined;

  const isMatching = (name) => {
    const lower = name.toLowerCase();
    if (lower.endsWith(".blockmap") || lower.endsWith(".yml") || lower.endsWith(".yaml")) {
      return false;
    }

    if (platform === "linux") {
      if (lower.endsWith(".deb")) {
        if (arch === "x64" || arch === "amd64") {
          return lower.includes("amd64") || lower.includes("x64");
        }
        if (arch === "arm64") return lower.includes("arm64");
        return true;
      }
      if (lower.endsWith(".appimage")) {
        if (arch === "x64" || arch === "amd64") {
          return !lower.includes("arm64") && !lower.includes("armv7");
        }
        return true;
      }
    }

    if (platform === "win32") {
      if (lower.endsWith(".exe")) {
        if (arch === "x64") return lower.includes("x64") || lower.includes("setup") || !lower.includes("arm64");
        if (arch === "arm64") return lower.includes("arm64");
        return true;
      }
    }

    if (platform === "darwin") {
      if (lower.endsWith(".dmg")) {
        if (arch === "arm64") return lower.includes("arm64");
        if (arch === "x64") return lower.includes("x64") || !lower.includes("arm64");
        return true;
      }
      if (lower.endsWith(".zip")) {
        if (arch === "arm64") return lower.includes("arm64");
        return true;
      }
    }

    return false;
  };

  return assets.find((asset) =>
    typeof asset?.name === "string" &&
    typeof asset?.browser_download_url === "string" &&
    isMatching(asset.name)
  );
}

module.exports = { compareVersions, selectAsset };

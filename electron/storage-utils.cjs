const fs = require("node:fs")
const path = require("node:path")

const STORAGE_SIZE_CACHE_TTL = 30 * 60 * 1000
const directorySizeCache = new Map()

async function scanDirectorySize(dirPath) {
  let total = 0
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        total += await scanDirectorySize(fullPath)
      } else if (entry.isFile()) {
        total += (await fs.promises.stat(fullPath)).size
      }
    }
  } catch {}
  return total
}

async function getDirectorySize(dirPath) {
  const cached = directorySizeCache.get(dirPath)
  if (cached?.pending) return cached.pending
  if (cached && Date.now() - cached.checkedAt < STORAGE_SIZE_CACHE_TTL) {
    return cached.bytes
  }

  const pending = scanDirectorySize(dirPath).then((bytes) => {
    directorySizeCache.set(dirPath, { bytes, checkedAt: Date.now() })
    return bytes
  })
  directorySizeCache.set(dirPath, { pending })
  return pending
}

function invalidateDirectorySize(dirPath) {
  if (dirPath) directorySizeCache.delete(dirPath)
  else directorySizeCache.clear()
}

module.exports = {
  STORAGE_SIZE_CACHE_TTL,
  getDirectorySize,
  invalidateDirectorySize,
}

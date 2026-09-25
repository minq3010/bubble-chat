const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const {
  getDirectorySize,
  invalidateDirectorySize,
} = require("./storage-utils.cjs")

async function test() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bubble-storage-"))
  try {
    fs.writeFileSync(path.join(dir, "one"), "1234")
    assert.equal(await getDirectorySize(dir), 4)

    fs.writeFileSync(path.join(dir, "two"), "56")
    assert.equal(await getDirectorySize(dir), 4)

    invalidateDirectorySize(dir)
    assert.equal(await getDirectorySize(dir), 6)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

test().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

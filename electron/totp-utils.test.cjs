const assert = require("node:assert/strict")
const { base32Decode, generateHOTP } = require("./totp-utils.cjs")

const secretText = "12345678901234567890"
const secret = base32Decode("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ")

assert.equal(secret.toString("ascii"), secretText)
assert.equal(generateHOTP(secret, 0), "755224")
assert.equal(generateHOTP(secret, 1), "287082")

console.log("totp-utils tests passed")

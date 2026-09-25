const crypto = require("node:crypto")

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

function base32Decode(base32) {
  const clean = String(base32)
    .toUpperCase()
    .replace(/=+$/, "")
    .replace(/[\s-]/g, "")
  let bits = ""
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i])
    if (val === -1) continue
    bits += val.toString(2).padStart(5, "0")
  }
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2))
  }
  return Buffer.from(bytes)
}

function generateHOTP(secretBuffer, counter, digits = 6) {
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigInt64BE(BigInt(counter), 0)
  const hmac = crypto.createHmac("sha1", secretBuffer)
  hmac.update(counterBuffer)
  const digest = hmac.digest()
  const offset = digest[digest.length - 1] & 0x0f
  const codeInt =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  return (codeInt % Math.pow(10, digits)).toString().padStart(digits, "0")
}

function verifyTOTP(token, base32Secret, period = 60, windowTolerance = 1) {
  if (!token || !base32Secret) return false
  const cleanToken = String(token).trim()
  if (cleanToken.length !== 6) return false
  try {
    const secretBuffer = base32Decode(base32Secret)
    const currentCounter = Math.floor(Date.now() / 1000 / period)
    for (let i = -windowTolerance; i <= windowTolerance; i++) {
      if (generateHOTP(secretBuffer, currentCounter + i, 6) === cleanToken) {
        return true
      }
    }
  } catch (err) {
    console.error("TOTP verification error:", err)
  }
  return false
}

module.exports = { base32Decode, generateHOTP, verifyTOTP }

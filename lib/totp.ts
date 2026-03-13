/**
 * TOTP implementation (RFC 6238 / RFC 4226)
 * Compatible Google Authenticator, Authy, etc.
 * Uses only Node.js built-in `crypto` — no external dependency.
 */

import { createHmac, randomBytes } from 'crypto'
import QRCode from 'qrcode'

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Decode(input: string): Buffer {
  const str = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')
  const bytes: number[] = []
  let bits = 0
  let value = 0

  for (const char of str) {
    const idx = BASE32.indexOf(char)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

function base32Encode(buf: Buffer): string {
  let result = ''
  let bits = 0
  let value = 0
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i]
    bits += 8
    while (bits >= 5) {
      result += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) result += BASE32[(value << (5 - bits)) & 31]
  return result
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret)
  const buf = Buffer.alloc(8)
  let tmp = counter
  for (let i = 7; i >= 0; i--) {
    buf[i] = tmp & 0xff
    tmp = Math.floor(tmp / 256)
  }
  const hmac = createHmac('sha1', key)
  hmac.update(buf)
  const digest = hmac.digest()
  const offset = digest[digest.length - 1] & 0x0f
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  return (code % 1_000_000).toString().padStart(6, '0')
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20))
}

export function verifyTotpCode(token: string, secret: string, window = 1): boolean {
  const counter = Math.floor(Date.now() / 1000 / 30)
  for (let i = -window; i <= window; i++) {
    if (hotp(secret, counter + i) === token) return true
  }
  return false
}

export async function generateQRCode(email: string, secret: string): Promise<string> {
  const otpauth =
    `otpauth://totp/Wealth%20Tracker:${encodeURIComponent(email)}` +
    `?secret=${secret}&issuer=Wealth%20Tracker&algorithm=SHA1&digits=6&period=30`
  return QRCode.toDataURL(otpauth)
}

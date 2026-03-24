import crypto from 'crypto'

const SECRET = process.env.NEXTAUTH_SECRET ?? 'fallback-secret'

export function signDeviceToken(userId: string): string {
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000
  const data = `${userId}.${exp}`
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifyDeviceToken(userId: string, token: string): boolean {
  try {
    const lastDot = token.lastIndexOf('.')
    if (lastDot < 0) return false
    const data = token.slice(0, lastDot)
    const sig = token.slice(lastDot + 1)
    const [uid, expStr] = data.split('.')
    if (uid !== userId) return false
    if (Date.now() > Number(expStr)) return false
    const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
    const sigBuf = Buffer.from(sig, 'base64url')
    const expBuf = Buffer.from(expected, 'base64url')
    if (sigBuf.length !== expBuf.length) return false
    return crypto.timingSafeEqual(sigBuf, expBuf)
  } catch {
    return false
  }
}

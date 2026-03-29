import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET ?? 'fallback-secret'

export interface MobileUser {
  id:    string
  email: string
  name?: string | null
}

export function getMobileUser(req: NextRequest): MobileUser | null {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any
    return { id: payload.sub, email: payload.email, name: payload.name ?? null }
  } catch {
    return null
  }
}

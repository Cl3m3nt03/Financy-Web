import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

/**
 * Unified auth helper — accepts both NextAuth session (web) and Bearer JWT (mobile).
 * Use this in every API route instead of getServerSession directly.
 */
export async function getUser(req: NextRequest): Promise<MobileUser | null> {
  // 1. Try Bearer JWT (mobile)
  const mobileUser = getMobileUser(req)
  if (mobileUser) return mobileUser

  // 2. Fall back to NextAuth session (web)
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return {
    id:    (session.user as any).id,
    email: session.user.email ?? '',
    name:  session.user.name  ?? null,
  }
}

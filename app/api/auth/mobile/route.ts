import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

const JWT_SECRET = process.env.NEXTAUTH_SECRET ?? 'fallback-secret'
const TOKEN_TTL  = 30 * 24 * 60 * 60 // 30 jours

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  })

  if (!user?.password) {
    await bcrypt.compare(password, '$2b$10$invalid.hash.for.timing')
    return NextResponse.json({ error: 'Identifiants invalides.' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return NextResponse.json({ error: 'Identifiants invalides.' }, { status: 401 })
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  )

  return NextResponse.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  })
}

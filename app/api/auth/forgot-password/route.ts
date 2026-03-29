import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 heure

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requis.' }, { status: 400 })

  // Toujours répondre OK (ne pas révéler si l'email existe)
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  })

  if (user) {
    // Invalider les anciens tokens non utilisés
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    })

    const token = crypto.randomBytes(32).toString('hex')
    await prisma.passwordResetToken.create({
      data: {
        userId:    user.id,
        token,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    await sendPasswordResetEmail(user.email, user.name ?? undefined, `${baseUrl}/reset-password?token=${token}`)
  }

  return NextResponse.json({ ok: true })
}

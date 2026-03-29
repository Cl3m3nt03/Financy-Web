import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 heure

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requis.' }, { status: 400 })

  const normalizedEmail = email.toLowerCase().trim()
  console.log('[forgot-password] Tentative pour:', normalizedEmail)

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  console.log('[forgot-password] Utilisateur trouvé:', !!user)

  if (user) {
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

    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? vercelUrl ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    console.log('[forgot-password] baseUrl:', baseUrl)
    console.log('[forgot-password] RESEND_API_KEY présente:', !!process.env.RESEND_API_KEY)

    const sent = await sendPasswordResetEmail(
      user.email,
      user.name ?? undefined,
      resetUrl
    )

    console.log('[forgot-password] Email envoyé:', sent)
  }

  return NextResponse.json({ ok: true })
}

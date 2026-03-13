import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase().trim() },
  })

  if (!user) {
    return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 })
  }

  if (!user.emailOtpCode || !user.emailOtpExpiry) {
    return NextResponse.json({ error: 'Aucun code en attente' }, { status: 400 })
  }

  if (new Date() > user.emailOtpExpiry) {
    return NextResponse.json({ error: 'Code expiré. Recréez votre compte.' }, { status: 400 })
  }

  if (parsed.data.code !== user.emailOtpCode) {
    return NextResponse.json({ error: 'Code incorrect.' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: true,
      emailOtpCode: null,
      emailOtpExpiry: null,
    },
  })

  return NextResponse.json({ success: true })
}

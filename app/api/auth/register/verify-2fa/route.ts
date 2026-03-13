import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyTotpCode } from '@/lib/totp'
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

  if (!user?.twoFactorSecret) {
    return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 })
  }

  const isValid = verifyTotpCode(parsed.data.code, user.twoFactorSecret)
  if (!isValid) {
    return NextResponse.json({ error: 'Code incorrect. Vérifiez votre application.' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true, twoFactorVerified: true },
  })

  return NextResponse.json({ success: true })
}

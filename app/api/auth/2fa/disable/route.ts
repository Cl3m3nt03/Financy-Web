import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateOtpCode, sendOtpEmail } from '@/lib/email'
import { z } from 'zod'

const schema = z.object({ code: z.string().length(6).optional() })

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!user.twoFactorEnabled) {
    return NextResponse.json({ error: '2FA not enabled' }, { status: 400 })
  }

  // Pas encore de code fourni → envoyer un code par email
  if (!parsed.data.code) {
    const code = generateOtpCode()
    const expiry = new Date(Date.now() + 10 * 60 * 1000)
    await prisma.user.update({
      where: { id: userId },
      data: { emailOtpCode: code, emailOtpExpiry: expiry },
    })
    await sendOtpEmail(user.email, code)
    return NextResponse.json({ codeSent: true })
  }

  // Code fourni → vérifier
  if (!user.emailOtpCode || !user.emailOtpExpiry) {
    return NextResponse.json({ error: 'Aucun code en attente.' }, { status: 400 })
  }
  if (new Date() > user.emailOtpExpiry) {
    return NextResponse.json({ error: 'Code expiré.' }, { status: 400 })
  }
  if (parsed.data.code !== user.emailOtpCode) {
    return NextResponse.json({ error: 'Code incorrect.' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, emailOtpCode: null, emailOtpExpiry: null },
  })

  return NextResponse.json({ success: true })
}

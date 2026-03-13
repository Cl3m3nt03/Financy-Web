import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({ code: z.string().length(6) })

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Code invalide' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.emailOtpCode || !user.emailOtpExpiry) {
    return NextResponse.json({ error: 'Aucun code en attente. Relancez la configuration.' }, { status: 400 })
  }

  if (new Date() > user.emailOtpExpiry) {
    return NextResponse.json({ error: 'Code expiré. Relancez la configuration.' }, { status: 400 })
  }

  if (parsed.data.code !== user.emailOtpCode) {
    return NextResponse.json({ error: 'Code incorrect.' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true, emailOtpCode: null, emailOtpExpiry: null },
  })

  return NextResponse.json({ success: true })
}

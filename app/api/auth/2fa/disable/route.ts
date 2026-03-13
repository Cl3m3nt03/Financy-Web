import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyTotpCode } from '@/lib/totp'
import { totpVerifySchema } from '@/lib/validations'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const body = await req.json()
  const parsed = totpVerifySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Code invalide' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.twoFactorSecret || !user.twoFactorEnabled) {
    return NextResponse.json({ error: '2FA not enabled' }, { status: 400 })
  }

  const isValid = verifyTotpCode(parsed.data.code, user.twoFactorSecret)
  if (!isValid) {
    return NextResponse.json({ error: 'Code incorrect' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorVerified: false },
  })

  return NextResponse.json({ success: true })
}

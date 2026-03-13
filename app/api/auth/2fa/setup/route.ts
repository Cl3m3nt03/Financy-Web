import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateTotpSecret, generateQRCode } from '@/lib/totp'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (user.twoFactorEnabled) {
    return NextResponse.json({ error: 'Already enabled' }, { status: 400 })
  }

  const secret = generateTotpSecret()
  const qrCode = await generateQRCode(user.email, secret)

  // Store secret but don't enable yet (must verify first)
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  })

  return NextResponse.json({ secret, qrCode })
}

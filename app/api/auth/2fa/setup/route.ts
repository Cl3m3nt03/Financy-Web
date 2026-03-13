import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateOtpCode, sendOtpEmail } from '@/lib/email'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (user.twoFactorEnabled) {
    return NextResponse.json({ error: 'Already enabled' }, { status: 400 })
  }

  const code = generateOtpCode()
  const expiry = new Date(Date.now() + 10 * 60 * 1000)

  await prisma.user.update({
    where: { id: userId },
    data: { emailOtpCode: code, emailOtpExpiry: expiry },
  })

  await sendOtpEmail(user.email, code)

  return NextResponse.json({ success: true })
}

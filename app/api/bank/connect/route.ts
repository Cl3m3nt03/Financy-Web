import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createAuthSession } from '@/lib/enablebanking'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  try {
    const { bankName, country = 'FR' } = await req.json()
    if (!bankName) return NextResponse.json({ error: 'bankName required' }, { status: 400 })

    const appUrl      = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const redirectUri = `${appUrl}/api/bank/callback`

    const connection = await prisma.bankConnection.create({
      data: { userId, institutionId: bankName, institutionName: bankName, status: 'PENDING' },
    })

    const authSession = await createAuthSession(bankName, country, redirectUri, connection.id)

    // Store session URL reference in tinkUserId field (repurposed)
    await prisma.bankConnection.update({
      where: { id: connection.id },
      data:  { tinkUserId: connection.id }, // state = connection.id, used in callback
    })

    return NextResponse.json({ link: authSession.url, connectionId: connection.id })
  } catch (e: any) {
    console.error('[EB CONNECT]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

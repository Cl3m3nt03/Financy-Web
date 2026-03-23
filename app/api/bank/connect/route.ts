import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createAuthorizationGrant, buildTinkLinkUrl } from '@/lib/tink'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId  = (session.user as any).id
  const email   = (session.user as any).email ?? userId

  try {
    const appUrl     = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const redirectUri = `${appUrl}/api/bank/callback`
    const tinkUserId = `financy-${userId}`

    // Create (or reuse) the pending connection
    let connection = await prisma.bankConnection.findFirst({
      where: { userId, status: 'PENDING' },
    })
    if (!connection) {
      connection = await prisma.bankConnection.create({
        data: { userId, tinkUserId, status: 'PENDING' },
      })
    }

    const authCode = await createAuthorizationGrant(tinkUserId, email)
    const link     = buildTinkLinkUrl(authCode, redirectUri)

    return NextResponse.json({ link, connectionId: connection.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

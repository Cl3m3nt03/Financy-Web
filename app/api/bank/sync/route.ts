import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { refreshAccessToken, fetchAccounts, getAccountBalance } from '@/lib/tink'

// GET: list all connections for current user
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const connections = await prisma.bankConnection.findMany({
    where:   { userId },
    include: { accounts: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(connections.map(c => ({
    ...c,
    accessToken:  undefined,
    refreshToken: undefined,
  })))
}

// POST: re-sync a connection
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const { connectionId } = await req.json()
  const connection = await prisma.bankConnection.findFirst({ where: { id: connectionId, userId } })
  if (!connection) return NextResponse.json({ error: 'Non trouvée' }, { status: 404 })
  if (!connection.accessToken) return NextResponse.json({ error: 'Pas de session code' }, { status: 400 })

  try {
    let accessToken = connection.accessToken!

    // Refresh token if available
    if (connection.refreshToken) {
      const tokens = await refreshAccessToken(connection.refreshToken)
      accessToken  = tokens.access_token
      await prisma.bankConnection.update({
        where: { id: connection.id },
        data:  { accessToken: tokens.access_token, refreshToken: tokens.refresh_token },
      })
    }

    const accounts = await fetchAccounts(accessToken)

    for (const account of accounts) {
      const { amount, currency } = getAccountBalance(account)
      const iban = account.identifiers?.iban?.iban ?? null

      const existing = await prisma.bankAccount.findUnique({ where: { nordigenId: account.id } })
      if (existing) {
        await prisma.bankAccount.update({
          where: { nordigenId: account.id },
          data:  { balance: amount, currency, updatedAt: new Date() },
        })
      } else {
        await prisma.bankAccount.create({
          data: {
            connectionId: connection.id,
            nordigenId:   account.id,
            iban,
            name:         account.name ?? iban ?? 'Compte',
            currency,
            balance:      amount,
            balanceType:  account.type,
          },
        })
      }
    }

    await prisma.bankConnection.update({
      where: { id: connection.id },
      data:  { lastSyncAt: new Date(), status: 'LINKED' },
    })

    const updated = await prisma.bankAccount.findMany({ where: { connectionId: connection.id } })
    return NextResponse.json({ success: true, accounts: updated })
  } catch (e: any) {
    console.error('[EB SYNC]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE: remove a connection
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const { id } = await req.json()
  const connection = await prisma.bankConnection.findFirst({ where: { id, userId } })
  if (!connection) return NextResponse.json({ error: 'Non trouvée' }, { status: 404 })

  await prisma.bankConnection.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getRequisition, getAccountDetails, getAccountBalances } from '@/lib/nordigen'

// Called after OAuth redirect: finalize a pending connection and fetch accounts
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const { requisitionId } = await req.json()

  const connection = await prisma.bankConnection.findFirst({
    where: { requisitionId, userId },
    include: { accounts: true },
  })
  if (!connection) return NextResponse.json({ error: 'Connection non trouvée' }, { status: 404 })

  try {
    const requisition = await getRequisition(requisitionId)

    if (requisition.status !== 'LN') {
      await prisma.bankConnection.update({
        where: { id: connection.id },
        data: { status: requisition.status === 'EX' ? 'EXPIRED' : 'PENDING' },
      })
      return NextResponse.json({ status: requisition.status, accounts: [] })
    }

    // Fetch all account details + balances
    const accountResults = []
    for (const accountId of requisition.accounts) {
      try {
        const [details, balances] = await Promise.all([
          getAccountDetails(accountId),
          getAccountBalances(accountId),
        ])

        // Prefer interimAvailable, fallback to closingBooked
        const balance = balances.find(b => b.balanceType === 'interimAvailable')
          ?? balances.find(b => b.balanceType === 'closingBooked')
          ?? balances[0]

        const balanceAmount = balance ? parseFloat(balance.balanceAmount.amount) : 0
        const currency = balance?.balanceAmount.currency ?? details.currency ?? 'EUR'

        const existing = await prisma.bankAccount.findUnique({ where: { nordigenId: accountId } })
        if (existing) {
          await prisma.bankAccount.update({
            where: { nordigenId: accountId },
            data: { balance: balanceAmount, updatedAt: new Date() },
          })
          accountResults.push({ ...existing, balance: balanceAmount })
        } else {
          const created = await prisma.bankAccount.create({
            data: {
              connectionId: connection.id,
              nordigenId:   accountId,
              iban:         details.iban ?? null,
              name:         details.name ?? details.product ?? null,
              currency,
              balance:      balanceAmount,
              balanceType:  balance?.balanceType ?? null,
            },
          })
          accountResults.push(created)
        }
      } catch (e) {
        console.error(`[BANK SYNC] Account ${accountId} error:`, e)
      }
    }

    await prisma.bankConnection.update({
      where: { id: connection.id },
      data: { status: 'LINKED', lastSyncAt: new Date() },
    })

    return NextResponse.json({ status: 'LINKED', accounts: accountResults })
  } catch (e: any) {
    await prisma.bankConnection.update({
      where: { id: connection.id },
      data: { status: 'ERROR' },
    })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET: list all connections + accounts for current user
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const connections = await prisma.bankConnection.findMany({
    where: { userId },
    include: { accounts: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(connections)
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

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getRequisition, getAccountDetails, getAccountBalances, pickBalance } from '@/lib/gocardless'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId  = session?.user ? (session.user as any).id : null

  const { searchParams } = new URL(req.url)
  const ref   = searchParams.get('ref')   // GoCardless requisition ID
  const error = searchParams.get('error')

  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  if (error || !ref) {
    return NextResponse.redirect(`${appUrl}/settings?bank=error&reason=${error ?? 'no_ref'}`)
  }

  try {
    // Find the pending connection by requisition ID (stored in tinkUserId)
    const connection = userId
      ? await prisma.bankConnection.findFirst({
          where: { userId, tinkUserId: ref, status: 'PENDING' },
        })
      : null

    if (!connection) {
      return NextResponse.redirect(`${appUrl}/settings?bank=error&reason=no_connection`)
    }

    // Get the requisition + its account IDs
    const requisition = await getRequisition(ref)

    if (!requisition.accounts?.length) {
      await prisma.bankConnection.update({
        where: { id: connection.id },
        data:  { status: 'ERROR' },
      })
      return NextResponse.redirect(`${appUrl}/settings?bank=error&reason=no_accounts`)
    }

    // Fetch details + balances for each account
    for (const accountId of requisition.accounts) {
      const [details, balances] = await Promise.all([
        getAccountDetails(accountId),
        getAccountBalances(accountId),
      ])
      const { amount, currency, type } = pickBalance(balances)

      const existing = await prisma.bankAccount.findUnique({ where: { nordigenId: accountId } })
      if (existing) {
        await prisma.bankAccount.update({
          where: { nordigenId: accountId },
          data:  { balance: amount, currency, updatedAt: new Date() },
        })
      } else {
        await prisma.bankAccount.create({
          data: {
            connectionId: connection.id,
            nordigenId:   accountId,
            iban:         details.iban ?? null,
            name:         details.name ?? null,
            currency,
            balance:      amount,
            balanceType:  type,
          },
        })
      }
    }

    await prisma.bankConnection.update({
      where: { id: connection.id },
      data:  { status: 'LINKED', lastSyncAt: new Date(), institutionName: requisition.institution_id },
    })

    return NextResponse.redirect(`${appUrl}/settings?bank=linked`)
  } catch (e: any) {
    console.error('[GC CALLBACK]', e)
    if (userId) {
      await prisma.bankConnection.updateMany({
        where: { userId, tinkUserId: ref ?? undefined, status: 'PENDING' },
        data:  { status: 'ERROR' },
      })
    }
    return NextResponse.redirect(`${appUrl}/settings?bank=error&reason=callback_failed`)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getSessionAccounts, getAccountBalances, pickBalance } from '@/lib/enablebanking'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId  = session?.user ? (session.user as any).id : null

  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')   // auth_code from EnableBanking
  const state = searchParams.get('state')  // = connectionId
  const error = searchParams.get('error')

  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?bank=error&reason=${error ?? 'missing_params'}`)
  }

  try {
    const connection = userId
      ? await prisma.bankConnection.findFirst({ where: { id: state, userId, status: 'PENDING' } })
      : null

    if (!connection) {
      return NextResponse.redirect(`${appUrl}/settings?bank=error&reason=no_connection`)
    }

    const accounts = await getSessionAccounts(code)

    if (!accounts.length) {
      await prisma.bankConnection.update({ where: { id: connection.id }, data: { status: 'ERROR' } })
      return NextResponse.redirect(`${appUrl}/settings?bank=error&reason=no_accounts`)
    }

    for (const account of accounts) {
      const balances = await getAccountBalances(account.uid)
      const { amount, currency, type } = pickBalance(balances)
      const iban = account.account_id?.iban ?? null

      const existing = await prisma.bankAccount.findUnique({ where: { nordigenId: account.uid } })
      if (existing) {
        await prisma.bankAccount.update({
          where: { nordigenId: account.uid },
          data:  { balance: amount, currency, updatedAt: new Date() },
        })
      } else {
        await prisma.bankAccount.create({
          data: {
            connectionId: connection.id,
            nordigenId:   account.uid,
            iban,
            name:         account.name ?? account.details ?? iban ?? 'Compte',
            currency,
            balance:      amount,
            balanceType:  type,
          },
        })
      }
    }

    await prisma.bankConnection.update({
      where: { id: connection.id },
      data:  { status: 'LINKED', lastSyncAt: new Date(), accessToken: code },
    })

    return NextResponse.redirect(`${appUrl}/settings?bank=linked`)
  } catch (e: any) {
    console.error('[EB CALLBACK]', e)
    if (userId && state) {
      await prisma.bankConnection.updateMany({
        where: { id: state, userId, status: 'PENDING' },
        data:  { status: 'ERROR' },
      })
    }
    return NextResponse.redirect(`${appUrl}/settings?bank=error&reason=callback_failed`)
  }
}

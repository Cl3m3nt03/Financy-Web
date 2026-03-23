import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { exchangeCode, fetchAccounts, getAccountBalance } from '@/lib/tink'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId  = session?.user ? (session.user as any).id : null

  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?bank=error&reason=${error ?? 'no_code'}`)
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCode(code)

    // Find the pending connection for this user
    const connection = userId
      ? await prisma.bankConnection.findFirst({ where: { userId, status: 'PENDING' } })
      : null

    if (!connection) {
      return NextResponse.redirect(`${appUrl}/settings?bank=error&reason=no_connection`)
    }

    // Fetch accounts
    const accounts = await fetchAccounts(tokens.access_token)

    // Persist tokens + accounts
    await prisma.bankConnection.update({
      where: { id: connection.id },
      data: {
        accessToken:    tokens.access_token,
        refreshToken:   tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        status:         'LINKED',
        lastSyncAt:     new Date(),
      },
    })

    for (const account of accounts) {
      const { amount, currency } = getAccountBalance(account)
      const iban = account.identifiers?.iban?.iban ?? null
      const name = account.name ?? account.type ?? null

      const existing = await prisma.bankAccount.findUnique({ where: { nordigenId: account.id } })
      if (existing) {
        await prisma.bankAccount.update({
          where: { nordigenId: account.id },
          data: { balance: amount, currency, name, updatedAt: new Date() },
        })
      } else {
        await prisma.bankAccount.create({
          data: {
            connectionId: connection.id,
            nordigenId:   account.id,
            iban,
            name,
            currency,
            balance:      amount,
            balanceType:  account.type,
          },
        })
      }
    }

    return NextResponse.redirect(`${appUrl}/settings?bank=linked`)
  } catch (e: any) {
    console.error('[TINK CALLBACK]', e)
    if (userId) {
      await prisma.bankConnection.updateMany({
        where: { userId, status: 'PENDING' },
        data: { status: 'ERROR' },
      })
    }
    return NextResponse.redirect(`${appUrl}/settings?bank=error&reason=callback_failed`)
  }
}

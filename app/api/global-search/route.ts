import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ assets: [], transactions: [], goals: [] })

  const [assets, transactions, goals] = await Promise.all([
    prisma.asset.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { institution: { contains: q, mode: 'insensitive' } },
          { type: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: { id: true, name: true, type: true, value: true, currency: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        OR: [
          { symbol: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
          { tags: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 5,
      orderBy: { date: 'desc' },
      select: { id: true, type: true, symbol: true, price: true, currency: true, date: true, notes: true },
    }),
    prisma.goal.findMany({
      where: { userId, name: { contains: q, mode: 'insensitive' } },
      take: 5,
      select: { id: true, name: true, targetValue: true, currency: true },
    }),
  ])

  return NextResponse.json({ assets, transactions, goals })
}

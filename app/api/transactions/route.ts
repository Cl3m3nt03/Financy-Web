import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/mobile-auth'
import { z } from 'zod'

const schema = z.object({
  type:      z.enum(['BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL', 'DIVIDEND']),
  symbol:    z.string().optional(),
  assetId:   z.string().optional(),
  holdingId: z.string().optional(),
  quantity:  z.number().positive().optional(),
  price:     z.number().min(0),
  fees:      z.number().min(0).default(0),
  currency:  z.string().default('EUR'),
  date:      z.string(),
  notes:     z.string().optional(),
  tags:      z.string().optional(),
})

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type   = searchParams.get('type')
  const symbol = searchParams.get('symbol')
  const limit  = parseInt(searchParams.get('limit') ?? '100')

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      ...(type   ? { type }   : {}),
      ...(symbol ? { symbol } : {}),
    },
    orderBy: { date: 'desc' },
    take: limit,
    include: { holding: { select: { symbol: true, name: true, assetId: true } } },
  })

  return NextResponse.json(transactions)
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Support both {total} and {quantity*price} from mobile
  const price    = body.price    ?? (body.quantity && body.price ? body.price : 0)
  const quantity = body.quantity ?? null
  const total    = body.total    ?? (quantity && price ? quantity * price : price)

  const parsed = schema.safeParse({ ...body, price: price || total })
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { type, symbol, holdingId, fees, currency, date, notes, tags } = parsed.data

  const transaction = await prisma.transaction.create({
    data: {
      userId:    user.id,
      type,
      symbol:    symbol    ?? null,
      holdingId: holdingId ?? null,
      quantity:  quantity  ?? null,
      price:     price || total,
      fees:      fees ?? 0,
      currency:  currency ?? 'EUR',
      date:      new Date(date),
      notes:     notes ?? null,
      tags:      tags  ?? null,
    },
  })

  return NextResponse.json(transaction, { status: 201 })
}

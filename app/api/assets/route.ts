import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/mobile-auth'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assets = await prisma.asset.findMany({
    where: { userId: user.id },
    include: { holdings: true },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(assets)
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const FINANCIAL = ['STOCK', 'CRYPTO', 'PEA', 'CTO']
  const isFinancial = FINANCIAL.includes(body.type)

  const asset = await prisma.asset.create({
    data: {
      userId:      user.id,
      name:        body.name,
      type:        body.type,
      institution: body.institution ?? null,
      value:       parseFloat(body.value) || 0,
      currency:    body.currency ?? 'EUR',
      notes:       body.notes ?? null,
    },
    include: { holdings: true },
  })

  if (isFinancial && body.symbol && body.quantity && body.avgBuyPrice) {
    await prisma.holding.create({
      data: {
        assetId:     asset.id,
        symbol:      body.symbol,
        name:        body.name,
        quantity:    parseFloat(body.quantity),
        avgBuyPrice: parseFloat(body.avgBuyPrice),
        currency:    body.currency ?? 'EUR',
      },
    })
  }

  const full = await prisma.asset.findUnique({
    where: { id: asset.id },
    include: { holdings: true },
  })
  return NextResponse.json(full, { status: 201 })
}

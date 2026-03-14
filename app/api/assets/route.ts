import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const assets = await prisma.asset.findMany({
    where: { userId },
    include: { holdings: true },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(assets)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const body = await req.json()

  const FINANCIAL = ['STOCK', 'CRYPTO', 'PEA', 'CTO']
  const isFinancial = FINANCIAL.includes(body.type)

  const asset = await prisma.asset.create({
    data: {
      userId,
      name:        body.name,
      type:        body.type,
      institution: body.institution ?? null,
      value:       parseFloat(body.value) || 0,
      currency:    body.currency ?? 'EUR',
      notes:       body.notes ?? null,
    },
    include: { holdings: true },
  })

  // Create Holding for financial assets when symbol + quantity provided
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

  // Return with holdings included
  const full = await prisma.asset.findUnique({
    where: { id: asset.id },
    include: { holdings: true },
  })
  return NextResponse.json(full, { status: 201 })
}

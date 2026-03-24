import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await prisma.pokemonItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const item = await prisma.pokemonItem.create({
    data: {
      userId: session.user.id,
      itemType: body.itemType,
      name: body.name,
      setName: body.setName ?? null,
      language: body.language ?? 'FR',
      imageUrl: body.imageUrl ?? null,
      cardApiId: body.cardApiId ?? null,
      cardNumber: body.cardNumber ?? null,
      rarity: body.rarity ?? null,
      condition: body.condition ?? 'NM',
      isReverse: body.isReverse ?? false,
      isGraded: body.isGraded ?? false,
      gradeLabel: body.gradeLabel ?? null,
      sealedType: body.sealedType ?? null,
      pricechartingId: body.pricechartingId ?? null,
      quantity: body.quantity ?? 1,
      purchasePrice: parseFloat(body.purchasePrice) || 0,
      currentPrice: body.currentPrice ? parseFloat(body.currentPrice) : null,
      currency: body.currency ?? 'EUR',
      purchasedAt: body.purchasedAt ? new Date(body.purchasedAt) : null,
      notes: body.notes ?? null,
    },
  })
  return NextResponse.json(item, { status: 201 })
}

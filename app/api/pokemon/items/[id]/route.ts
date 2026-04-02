import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/mobile-auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const item = await prisma.pokemonItem.updateMany({
    where: { id: params.id, userId: user.id },
    data: {
      ...(body.currentPrice !== undefined && { currentPrice: parseFloat(body.currentPrice) }),
      ...(body.lastPriceAt  !== undefined && { lastPriceAt: new Date(body.lastPriceAt) }),
      ...(body.quantity     !== undefined && { quantity: body.quantity }),
      ...(body.notes        !== undefined && { notes: body.notes }),
      ...(body.condition    !== undefined && { condition: body.condition }),
    },
  })
  return NextResponse.json(item)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.pokemonItem.deleteMany({
    where: { id: params.id, userId: user.id },
  })
  return NextResponse.json({ ok: true })
}

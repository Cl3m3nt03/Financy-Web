import { getUser } from '@/lib/mobile-auth'
import { NextResponse } from 'next/server'


import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const _mobileUser = await getUser(req as any)
  if (!_mobileUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const item = await prisma.pokemonItem.updateMany({
    where: { id: params.id, userId: _mobileUser.id },
    data: {
      ...(body.currentPrice !== undefined && { currentPrice: parseFloat(body.currentPrice) }),
      ...(body.lastPriceAt !== undefined && { lastPriceAt: new Date(body.lastPriceAt) }),
      ...(body.quantity !== undefined && { quantity: body.quantity }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.condition !== undefined && { condition: body.condition }),
    },
  })
  return NextResponse.json(item)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const _mobileUser = await getUser(req as any)
  if (!_mobileUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.pokemonItem.deleteMany({
    where: { id: params.id, userId: _mobileUser.id },
  })
  return NextResponse.json({ ok: true })
}

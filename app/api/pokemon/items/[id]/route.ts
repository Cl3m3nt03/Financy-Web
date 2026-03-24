import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const item = await prisma.pokemonItem.updateMany({
    where: { id: params.id, userId: (session.user as any).id },
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
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.pokemonItem.deleteMany({
    where: { id: params.id, userId: (session.user as any).id },
  })
  return NextResponse.json({ ok: true })
}

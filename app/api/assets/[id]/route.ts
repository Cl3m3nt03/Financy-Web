import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/mobile-auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const asset = await prisma.asset.findFirst({ where: { id: params.id, userId: user.id } })
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.asset.update({
    where: { id: params.id },
    data: {
      name:        body.name        ?? asset.name,
      type:        body.type        ?? asset.type,
      institution: body.institution ?? asset.institution,
      value:       body.value !== undefined ? parseFloat(body.value) : asset.value,
      currency:    body.currency    ?? asset.currency,
      notes:       body.notes       ?? asset.notes,
    },
  })

  return NextResponse.json(updated)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return PATCH(req, { params })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const asset = await prisma.asset.findFirst({ where: { id: params.id, userId: user.id } })
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.asset.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}

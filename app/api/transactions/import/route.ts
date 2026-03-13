import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parseCSV } from '@/lib/csv-parser'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Fichier requis.' }, { status: 400 })

  const text = await file.text()
  const parsed = parseCSV(text)

  if (parsed.length === 0) {
    return NextResponse.json({ error: 'Aucune transaction détectée dans ce fichier.' }, { status: 400 })
  }

  const created = await prisma.$transaction(
    parsed.map(t =>
      prisma.transaction.create({
        data: {
          userId,
          type:     t.type,
          symbol:   t.symbol   ?? null,
          quantity: t.quantity ?? null,
          price:    t.price,
          fees:     t.fees,
          currency: t.currency,
          date:     new Date(t.date),
          notes:    t.notes    ?? null,
        },
      })
    )
  )

  return NextResponse.json({ imported: created.length })
}

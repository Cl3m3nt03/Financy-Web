import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/mobile-auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  targets: z.record(z.string(), z.number().min(0).max(100)), // { STOCK: 40, CRYPTO: 10, ... }
})

export async function POST(req: NextRequest) {
  const _u = await getUser(req)
  if (!_u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = _u.id

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const assets = await prisma.asset.findMany({ where: { userId } })
  const totalValue = assets.reduce((s, a) => s + a.value, 0)
  if (totalValue === 0) return NextResponse.json({ suggestions: [] })

  const byType: Record<string, number> = {}
  for (const a of assets) {
    byType[a.type] = (byType[a.type] ?? 0) + a.value
  }

  const targets: Record<string, number> = parsed.data.targets
  const sumTargets = Object.values(targets).reduce((s: number, v: number) => s + v, 0)

  const suggestions = Object.entries(targets).map(([type, targetPct]: [string, number]) => {
    const currentValue = byType[type] ?? 0
    const currentPct   = (currentValue / totalValue) * 100
    const targetValue  = (targetPct / 100) * totalValue
    const delta        = targetValue - currentValue
    const deltaPct     = targetPct - currentPct
    return { type, currentValue, currentPct, targetPct, targetValue, delta, deltaPct }
  }).filter((s: { delta: number }) => Math.abs(s.delta) > 1)

  return NextResponse.json({ totalValue, sumTargets, suggestions })
}

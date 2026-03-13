'use client'

import { Sankey, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Asset } from '@/types'
import { getAssetTypeLabel, getAssetTypeColor, formatCurrency } from '@/lib/utils'

const ACCENT = '#C9A84C'

function buildSankeyData(assets: Asset[]) {
  const active = assets.filter(a => a.value > 0)
  const types = [...new Set(active.map(a => a.type))]
  const typeStart = 1
  const assetStart = 1 + types.length

  const nodes = [
    { name: 'Patrimoine', color: ACCENT },
    ...types.map(t => ({ name: getAssetTypeLabel(t), color: getAssetTypeColor(t) })),
    ...active.map(a => ({ name: a.name, color: getAssetTypeColor(a.type) })),
  ]

  const links = [
    ...types.map((type, ti) => ({
      source: 0,
      target: typeStart + ti,
      value: active
        .filter(a => a.type === type)
        .reduce((s, a) => s + a.value, 0),
    })),
    ...active.map((asset, ai) => ({
      source: typeStart + types.indexOf(asset.type),
      target: assetStart + ai,
      value: asset.value,
    })),
  ]

  return { nodes, links }
}

function CustomNode({ x = 0, y = 0, width = 10, height = 0, payload }: any) {
  const color: string = payload?.color ?? ACCENT
  const nodeH = Math.max(height as number, 2)
  const label: string = payload?.name ?? ''
  const truncated = label.length > 22 ? label.slice(0, 20) + '…' : label

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={nodeH}
        fill={color}
        fillOpacity={0.85}
        rx={3}
        ry={3}
      />
      <text
        x={(x as number) + (width as number) + 8}
        y={(y as number) + nodeH / 2}
        dy="0.35em"
        fontSize={11}
        fill="#A1A1AA"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {truncated}
      </text>
    </g>
  )
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null

  if ('source' in d) {
    return (
      <div className="bg-surface border border-border rounded-xl p-3 shadow-xl text-sm">
        <p className="text-text-muted text-xs mb-1">
          {d.source?.name} → {d.target?.name}
        </p>
        <p className="text-text-primary font-bold font-mono">
          {formatCurrency(d.value)}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-3 shadow-xl text-sm">
      <p className="text-text-muted text-xs mb-1">{d.name}</p>
      <p className="text-text-primary font-bold font-mono">
        {formatCurrency(d.value)}
      </p>
    </div>
  )
}

export function SankeyChart({ assets }: { assets: Asset[] }) {
  const data = buildSankeyData(assets)
  if (data.nodes.length < 3) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flux patrimoniaux</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={data}
              node={<CustomNode />}
              link={{ stroke: ACCENT, fill: ACCENT, fillOpacity: 0.12 }}
              nodePadding={12}
              nodeWidth={12}
              margin={{ top: 8, right: 185, bottom: 8, left: 0 }}
            >
              <Tooltip content={<CustomTooltip />} />
            </Sankey>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

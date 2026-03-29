import { useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, Animated, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { colors, fontSize, radius, spacing } from '@/constants/theme'
import { apiFetch, formatCurrency, formatPercent } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface Holding {
  id:          string
  symbol:      string
  name:        string
  quantity:    number
  avgBuyPrice: number
  currency:    string
  currentPrice?: number
  change24h?:    number
}

interface Asset {
  id:       string
  name:     string
  type:     string
  value:    number
  currency: string
  holdings: Holding[]
}

interface PriceData {
  symbol:       string
  price:        number
  change24h:    number
  changePct24h: number
}

const TYPE_COLORS: Record<string, string> = {
  STOCK:  '#3B82F6',
  CRYPTO: '#8B5CF6',
  PEA:    colors.accent,
  CTO:    '#A78BFA',
}

function PnlRow({ holding, price }: { holding: Holding; price?: PriceData }) {
  const currentPrice = price?.price ?? holding.avgBuyPrice
  const invested     = holding.avgBuyPrice * holding.quantity
  const current      = currentPrice * holding.quantity
  const pnl          = current - invested
  const pnlPct       = invested > 0 ? (pnl / invested) * 100 : 0
  const isPos        = pnl >= 0

  const flashAnim = useRef(new Animated.Value(0)).current
  const prevPrice = useRef<number>(currentPrice)

  useEffect(() => {
    if (price?.price && price.price !== prevPrice.current) {
      prevPrice.current = price.price
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]).start()
    }
  }, [price?.price])

  const flashColor = flashAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['transparent', isPos ? colors.success + '30' : colors.danger + '30'],
  })

  return (
    <Animated.View style={[s.holdingRow, { backgroundColor: flashColor }]}>
      <View style={s.holdingLeft}>
        <View style={[s.symbolBadge, { backgroundColor: (TYPE_COLORS[holding.symbol?.includes('.') ? 'STOCK' : 'CRYPTO'] ?? colors.accent) + '20' }]}>
          <Text style={[s.symbolText, { color: colors.accent }]}>
            {holding.symbol.replace(/\.[A-Z]+$/, '').slice(0, 4)}
          </Text>
        </View>
        <View>
          <Text style={s.holdingName} numberOfLines={1}>{holding.name}</Text>
          <Text style={s.holdingSymbol}>{holding.symbol} · {holding.quantity} parts</Text>
        </View>
      </View>

      <View style={s.holdingRight}>
        <Text style={s.holdingValue}>{formatCurrency(current, holding.currency)}</Text>
        <View style={[s.pnlBadge, { backgroundColor: isPos ? colors.success + '20' : colors.danger + '20' }]}>
          <Text style={{ color: isPos ? colors.success : colors.danger, fontSize: fontSize.xs, fontWeight: '600' }}>
            {isPos ? '+' : ''}{formatCurrency(pnl)} ({pnlPct.toFixed(1)}%)
          </Text>
        </View>
        {price && (
          <Text style={s.priceText}>
            {formatCurrency(price.price, holding.currency)}
            {' '}
            <Text style={{ color: price.change24h >= 0 ? colors.success : colors.danger }}>
              {formatPercent(price.changePct24h)}
            </Text>
          </Text>
        )}
      </View>
    </Animated.View>
  )
}

export default function PortfolioScreen() {
  const { data: assets, isLoading, refetch, isRefetching } = useQuery<Asset[]>({
    queryKey:      ['assets'],
    queryFn:       () => apiFetch('/api/assets'),
    refetchInterval: 30_000,
  })

  // Gather all symbols from holdings
  const symbols = (assets ?? [])
    .flatMap(a => a.holdings.map(h => h.symbol))
    .filter(Boolean)

  const { data: prices, refetch: refetchPrices } = useQuery<PriceData[]>({
    queryKey:        ['prices', symbols.join(',')],
    queryFn:         () => apiFetch(`/api/prices?symbols=${symbols.join(',')}`),
    enabled:         symbols.length > 0,
    refetchInterval: 10_000, // live every 10s
  })

  const priceMap = Object.fromEntries((prices ?? []).map(p => [p.symbol, p]))

  const financialAssets = (assets ?? []).filter(a =>
    ['STOCK', 'CRYPTO', 'PEA', 'CTO'].includes(a.type) && a.holdings.length > 0
  )
  const otherAssets = (assets ?? []).filter(a =>
    !['STOCK', 'CRYPTO', 'PEA', 'CTO'].includes(a.type)
  )

  // Compute total portfolio P&L
  const { totalInvested, totalCurrent } = financialAssets.reduce((acc, asset) => {
    for (const h of asset.holdings) {
      const price = priceMap[h.symbol]?.price ?? h.avgBuyPrice
      acc.totalInvested += h.avgBuyPrice * h.quantity
      acc.totalCurrent  += price * h.quantity
    }
    return acc
  }, { totalInvested: 0, totalCurrent: 0 })

  const totalPnl    = totalCurrent - totalInvested
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0
  const isPos       = totalPnl >= 0

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => { refetch(); refetchPrices() }}
            tintColor={colors.accent}
          />
        }
      >
        <Text style={s.pageTitle}>Portfolio</Text>

        {isLoading && <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />}

        {/* P&L global */}
        {financialAssets.length > 0 && (
          <Card style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, marginBottom: 4 }}>
              P&amp;L total investi
            </Text>
            <Text style={{ color: colors.textPrimary, fontSize: fontSize['2xl'], fontWeight: '700' }}>
              {formatCurrency(totalCurrent)}
            </Text>
            <View style={[s.pnlBadge, {
              backgroundColor: isPos ? colors.success + '20' : colors.danger + '20',
              marginTop: 8,
            }]}>
              <Text style={{ color: isPos ? colors.success : colors.danger, fontWeight: '700', fontSize: fontSize.sm }}>
                {isPos ? '+' : ''}{formatCurrency(totalPnl)} ({totalPnlPct.toFixed(2)}%)
              </Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, marginTop: 4 }}>
              ↺ Mis à jour toutes les 10 secondes
            </Text>
          </Card>
        )}

        {/* Financial assets with live P&L */}
        {financialAssets.map(asset => (
          <Card key={asset.id}>
            <View style={s.assetHeader}>
              <Text style={s.assetName}>{asset.name}</Text>
              <Badge
                label={asset.type}
                color={TYPE_COLORS[asset.type] ?? colors.accent}
              />
            </View>
            <View style={{ gap: 1, marginTop: 8 }}>
              {asset.holdings.map(h => (
                <PnlRow key={h.id} holding={h} price={priceMap[h.symbol]} />
              ))}
            </View>
          </Card>
        ))}

        {/* Other assets */}
        {otherAssets.length > 0 && (
          <Card>
            <Text style={s.sectionTitle}>Autres actifs</Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              {otherAssets.map(asset => (
                <View key={asset.id} style={s.otherRow}>
                  <Text style={s.otherName}>{asset.name}</Text>
                  <Text style={s.otherValue}>{formatCurrency(asset.value, asset.currency)}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {!isLoading && (assets ?? []).length === 0 && (
          <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📊</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, fontWeight: '600' }}>
              Aucun actif
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4, textAlign: 'center' }}>
              Ajoutez vos actifs depuis l'application web.
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },

  pageTitle: {
    color:      colors.textPrimary,
    fontSize:   fontSize['2xl'],
    fontWeight: '700',
    marginBottom: spacing.sm,
  },

  assetHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  assetName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: '600' },

  holdingRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius:    radius.md,
  },
  holdingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  holdingRight: { alignItems: 'flex-end', gap: 2 },

  symbolBadge: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  symbolText: { fontSize: fontSize.xs, fontWeight: '700' },

  holdingName:   { color: colors.textPrimary,   fontSize: fontSize.sm, fontWeight: '500', maxWidth: 140 },
  holdingSymbol: { color: colors.textMuted,      fontSize: fontSize.xs },
  holdingValue:  { color: colors.textPrimary,    fontSize: fontSize.sm, fontWeight: '600' },
  priceText:     { color: colors.textMuted,      fontSize: fontSize.xs },

  pnlBadge: {
    borderRadius:      radius.full,
    paddingHorizontal: 8,
    paddingVertical:   2,
  },

  sectionTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: '600' },
  otherRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingVertical: 6,
  },
  otherName:  { color: colors.textSecondary, fontSize: fontSize.sm },
  otherValue: { color: colors.textPrimary,   fontSize: fontSize.sm, fontWeight: '600' },
})

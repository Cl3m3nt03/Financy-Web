import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, Animated, ActivityIndicator, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, radius, spacing } from '@/constants/theme'
import { apiFetch, formatCurrency, formatPercent } from '@/lib/api'
import Svg, { Circle } from 'react-native-svg'

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

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const TYPE_ICONS: Record<string, { color: string; icon: IoniconsName }> = {
  STOCK:  { color: '#3B82F6', icon: 'bar-chart-outline'   },
  CRYPTO: { color: '#8B5CF6', icon: 'logo-bitcoin'        },
  PEA:    { color: colors.accent, icon: 'trending-up-outline' },
  CTO:    { color: '#A78BFA', icon: 'stats-chart-outline' },
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
    outputRange: ['transparent', isPos ? colors.success + '20' : colors.danger + '20'],
  })

  const cfg = TYPE_ICONS[holding.symbol?.includes('.') ? 'STOCK' : 'CRYPTO'] ?? { color: colors.accent, icon: 'trending-up-outline' as IoniconsName }

  return (
    <Animated.View style={[s.holdingRow, { backgroundColor: flashColor }]}>
      <View style={s.holdingLeft}>
        <View style={[s.symbolBadge, { backgroundColor: cfg.color + '18' }]}>
          <Text style={[s.symbolText, { color: cfg.color }]}>
            {holding.symbol.replace(/\.[A-Z]+$/, '').slice(0, 4)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.holdingName} numberOfLines={1}>{holding.name}</Text>
          <Text style={s.holdingSymbol}>{holding.symbol} · {holding.quantity} part{holding.quantity > 1 ? 's' : ''}</Text>
        </View>
      </View>

      <View style={s.holdingRight}>
        <Text style={s.holdingValue}>{formatCurrency(current, holding.currency)}</Text>
        <View style={[s.pnlBadge, { backgroundColor: isPos ? colors.success + '18' : colors.danger + '18' }]}>
          <Text style={{ color: isPos ? colors.success : colors.danger, fontSize: fontSize.xs, fontWeight: '600' }}>
            {isPos ? '+' : ''}{pnlPct.toFixed(1)}%
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
  const [activeTab, setActiveTab] = useState<'positions' | 'sectors' | 'dividends'>('positions')
  const { data: assets, isLoading, refetch, isRefetching } = useQuery<Asset[]>({
    queryKey:        ['assets'],
    queryFn:         () => apiFetch('/api/assets'),
    refetchInterval: 30_000,
  })

  const symbols = (assets ?? [])
    .flatMap(a => a.holdings.map(h => h.symbol))
    .filter(Boolean)

  const { data: prices, refetch: refetchPrices } = useQuery<PriceData[]>({
    queryKey:        ['prices', symbols.join(',')],
    queryFn:         () => apiFetch(`/api/prices?symbols=${symbols.join(',')}`),
    enabled:         symbols.length > 0,
    refetchInterval: 10_000,
  })

  const priceMap = Object.fromEntries((prices ?? []).map(p => [p.symbol, p]))

  const financialAssets = (assets ?? []).filter(a =>
    ['STOCK', 'CRYPTO', 'PEA', 'CTO'].includes(a.type) && a.holdings.length > 0
  )
  const otherAssets = (assets ?? []).filter(a =>
    !['STOCK', 'CRYPTO', 'PEA', 'CTO'].includes(a.type)
  )

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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => { refetch(); refetchPrices() }}
            tintColor={colors.accent}
          />
        }
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>Portfolio</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {prices && (
              <View style={s.liveChip}>
                <View style={s.liveDot} />
                <Text style={s.liveText}>Live</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => router.push('/portfolio/add' as any)} style={s.addBtn}>
              <Ionicons name="add" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Tabs ───────────────────────────────────────────────────── */}
        <View style={s.tabBar}>
          {(['positions', 'sectors', 'dividends'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[s.tabItem, activeTab === tab && s.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabLabel, activeTab === tab && s.tabLabelActive]}>
                {tab === 'positions' ? 'Positions' : tab === 'sectors' ? 'Secteurs' : 'Dividendes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading && <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />}

        {activeTab === 'positions' && (
          <>
            {/* ── P&L global ─────────────────────────────────────────────── */}
            {financialAssets.length > 0 && (
              <View style={s.heroCard}>
                <Text style={s.heroLabel}>Valeur totale investie</Text>
                <Text style={s.heroValue}>{formatCurrency(totalCurrent)}</Text>
                <View style={[s.pnlBadge, {
                  backgroundColor: isPos ? colors.success + '18' : colors.danger + '18',
                  borderColor:     isPos ? colors.success + '30' : colors.danger + '30',
                  marginTop: 10,
                }]}>
                  <Text style={{ color: isPos ? colors.success : colors.danger, fontWeight: '700', fontSize: fontSize.sm }}>
                    {isPos ? '+' : ''}{formatCurrency(totalPnl)} ({totalPnlPct.toFixed(2)}%)
                  </Text>
                </View>
                <Text style={s.updateNote}>
                  <Ionicons name="refresh-outline" size={10} color={colors.textMuted} /> Mis à jour toutes les 10s
                </Text>
              </View>
            )}

            {/* ── Positions financières ───────────────────────────────────── */}
            {financialAssets.map(asset => {
              const cfg = TYPE_ICONS[asset.type] ?? { color: colors.accent, icon: 'trending-up-outline' as IoniconsName }
              return (
                <View key={asset.id} style={s.card}>
                  <View style={s.assetHeader}>
                    <View style={[s.assetIconWrap, { backgroundColor: cfg.color + '15' }]}>
                      <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                    </View>
                    <Text style={s.assetName}>{asset.name}</Text>
                    <View style={[s.typeBadge, { backgroundColor: cfg.color + '18' }]}>
                      <Text style={{ color: cfg.color, fontSize: fontSize.xs, fontWeight: '600' }}>{asset.type}</Text>
                    </View>
                  </View>
                  <View style={{ gap: 1, marginTop: 10 }}>
                    {asset.holdings.map(h => (
                      <PnlRow key={h.id} holding={h} price={priceMap[h.symbol]} />
                    ))}
                  </View>
                </View>
              )
            })}

            {/* ── Autres actifs ───────────────────────────────────────────── */}
            {otherAssets.length > 0 && (
              <View style={s.card}>
                <Text style={s.sectionTitle}>Autres actifs</Text>
                <View style={{ gap: 10, marginTop: 12 }}>
                  {otherAssets.map(asset => (
                    <View key={asset.id} style={s.otherRow}>
                      <Text style={s.otherName}>{asset.name}</Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.otherValue}>{formatCurrency(asset.value, asset.currency)}</Text>
                        <Text style={s.otherType}>{asset.type}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {activeTab === 'sectors' && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Répartition par secteur</Text>
            <View style={{ gap: 14, marginTop: 20 }}>
              {Object.entries(TYPE_ICONS).map(([type, cfg]) => {
                const value = assets?.filter(a => a.type === type).reduce((acc, a) => acc + a.value, 0) ?? 0
                const totalCurrentValue = assets?.reduce((acc, a) => acc + a.value, 0) ?? 1
                const pct = (value / totalCurrentValue) * 100
                if (value === 0) return null
                return (
                  <View key={type}>
                    <View style={s.breakdownRow}>
                      <View style={[s.assetIconWrap, { backgroundColor: cfg.color + '15' }]}>
                        <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                      </View>
                      <Text style={s.breakdownLabel}>{type}</Text>
                      <Text style={s.breakdownPct}>{pct.toFixed(1)}%</Text>
                      <Text style={s.breakdownValue}>{formatCurrency(value)}</Text>
                    </View>
                    <View style={s.barBg}>
                      <View style={[s.barFill, { width: `${pct}%`, backgroundColor: cfg.color }]} />
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {activeTab === 'dividends' && (
          <View style={[s.card, { alignItems: 'center', paddingVertical: 40 }]}>
            <Ionicons name="pie-chart-outline" size={40} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, fontWeight: '600' }}>
              Dividendes & Revenus passifs
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4, textAlign: 'center' }}>
              Fonctionnalité en cours de synchronisation avec vos actifs à dividendes.
            </Text>
          </View>
        )}

        {!isLoading && (assets ?? []).length === 0 && (
          <View style={[s.card, { alignItems: 'center', paddingVertical: 48 }]}>
            <Ionicons name="bar-chart-outline" size={40} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, fontWeight: '600' }}>
              Aucun actif
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4, textAlign: 'center' }}>
              Commencez à suivre votre patrimoine en ajoutant un actif.
            </Text>
            <TouchableOpacity 
              onPress={() => router.push('/portfolio/add' as any)}
              style={{ marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.accent, borderRadius: radius.full }}
            >
              <Text style={{ color: colors.background, fontWeight: '600' }}>Ajouter un actif</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 32 },

  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  pageTitle:  { color: colors.textPrimary, fontSize: fontSize['2xl'], fontWeight: '700', letterSpacing: -0.5 },
  addBtn:     { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },

  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.success + '18', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  liveText: { color: colors.success, fontSize: fontSize.xs, fontWeight: '600' },

  heroCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, alignItems: 'center',
  },
  heroLabel: { color: colors.textMuted,    fontSize: fontSize.xs,    marginBottom: 6, letterSpacing: 0.5 },
  heroValue: { color: colors.textPrimary,  fontSize: 32,             fontWeight: '700', letterSpacing: -1 },
  updateNote: { color: colors.textMuted,   fontSize: fontSize.xs,    marginTop: 8 },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },

  assetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assetIconWrap: { width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  assetName: { flex: 1, color: colors.textPrimary, fontSize: fontSize.md, fontWeight: '600' },
  typeBadge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },

  holdingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 4, borderRadius: radius.md },
  holdingLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  holdingRight: { alignItems: 'flex-end', gap: 3 },

  symbolBadge: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  symbolText:  { fontSize: 10, fontWeight: '700' },

  holdingName:   { color: colors.textPrimary,   fontSize: fontSize.sm, fontWeight: '500', maxWidth: 130 },
  holdingSymbol: { color: colors.textMuted,      fontSize: fontSize.xs },
  holdingValue:  { color: colors.textPrimary,    fontSize: fontSize.sm, fontWeight: '600' },
  priceText:     { color: colors.textMuted,      fontSize: fontSize.xs },

  pnlBadge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },

  sectionTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: '600' },
  otherRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  otherName:  { flex: 1, color: colors.textSecondary, fontSize: fontSize.sm },
  otherValue: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: '600' },
  otherType:  { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 1 },

  tabBar: { flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.md, padding: 4, marginBottom: 10 },
  tabItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.surface },
  tabLabel: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '600' },
  tabLabelActive: { color: colors.accent },

  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  breakdownLabel: { flex: 1, color: colors.textSecondary, fontSize: fontSize.sm },
  breakdownPct:   { color: colors.textMuted, fontSize: fontSize.xs, width: 38, textAlign: 'right' },
  breakdownValue: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: '600', width: 95, textAlign: 'right' },
  barBg:   { height: 3, backgroundColor: colors.surface2, borderRadius: radius.full, overflow: 'hidden' },
  barFill: { height: 3, borderRadius: radius.full },
})

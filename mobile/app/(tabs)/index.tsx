import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { colors, fontSize, radius, spacing } from '@/constants/theme'
import { apiFetch, formatCurrency } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'

interface DashboardStats {
  totalWealth:    number
  monthlyChange:  number
  monthlyPct:     number
  breakdown: {
    BANK_ACCOUNT: number
    SAVINGS:      number
    REAL_ESTATE:  number
    STOCK:        number
    CRYPTO:       number
    PEA:          number
    CTO:          number
    OTHER:        number
  }
}

const TYPE_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  BANK_ACCOUNT: { label: 'Comptes',     color: colors.accent,  emoji: '🏦' },
  SAVINGS:      { label: 'Épargne',     color: '#06B6D4',      emoji: '🏛️' },
  REAL_ESTATE:  { label: 'Immobilier',  color: '#F97316',      emoji: '🏠' },
  STOCK:        { label: 'Bourse',      color: '#3B82F6',      emoji: '📊' },
  CRYPTO:       { label: 'Crypto',      color: '#8B5CF6',      emoji: '₿'  },
  PEA:          { label: 'PEA',         color: colors.accent,  emoji: '🇫🇷' },
  CTO:          { label: 'CTO',         color: '#A78BFA',      emoji: '📈' },
  OTHER:        { label: 'Autre',       color: colors.textMuted, emoji: '📦' },
}

export default function DashboardScreen() {
  const { user, logout } = useAuthStore()

  const { data, isLoading, refetch, isRefetching } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn:  () => apiFetch('/api/portfolio/stats'),
  })

  const changeColor = (data?.monthlyChange ?? 0) >= 0 ? colors.success : colors.danger
  const sign        = (data?.monthlyChange ?? 0) >= 0 ? '+' : ''

  const breakdownEntries = Object.entries(data?.breakdown ?? {})
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)

  const total = data?.totalWealth ?? 0

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Bonjour{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋</Text>
            <Text style={s.subtitle}>Votre patrimoine</Text>
          </View>
          <TouchableOpacity onPress={logout} style={s.logoutBtn}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        {/* Total wealth hero */}
        <Card style={s.heroCard}>
          <Text style={s.heroLabel}>Patrimoine total</Text>
          {isLoading
            ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 12 }} />
            : (
              <>
                <Text style={s.heroValue}>{formatCurrency(total)}</Text>
                {data && (
                  <View style={s.heroChange}>
                    <View style={[s.changeBadge, { backgroundColor: changeColor + '20' }]}>
                      <Text style={{ color: changeColor, fontSize: fontSize.sm, fontWeight: '600' }}>
                        {sign}{formatCurrency(data.monthlyChange)} ({sign}{data.monthlyPct.toFixed(2)}%)
                      </Text>
                    </View>
                    <Text style={s.changeSub}>ce mois</Text>
                  </View>
                )}
              </>
            )
          }
        </Card>

        {/* Quick stats */}
        {data && (
          <View style={s.statsRow}>
            <StatCard
              label="PEA + CTO"
              value={formatCurrency((data.breakdown.PEA ?? 0) + (data.breakdown.CTO ?? 0) + (data.breakdown.STOCK ?? 0))}
              sub="Bourse"
            />
            <StatCard
              label="Épargne"
              value={formatCurrency(data.breakdown.SAVINGS ?? 0)}
              sub="Livrets & fonds"
            />
          </View>
        )}

        {/* Breakdown */}
        {breakdownEntries.length > 0 && (
          <Card>
            <Text style={s.sectionTitle}>Répartition</Text>
            <View style={{ gap: 12, marginTop: 12 }}>
              {breakdownEntries.map(([type, value]) => {
                const cfg = TYPE_LABELS[type] ?? { label: type, color: colors.textMuted, emoji: '📦' }
                const pct = total > 0 ? (value / total) * 100 : 0
                return (
                  <View key={type}>
                    <View style={s.breakdownRow}>
                      <Text style={s.breakdownEmoji}>{cfg.emoji}</Text>
                      <Text style={s.breakdownLabel}>{cfg.label}</Text>
                      <Text style={s.breakdownPct}>{pct.toFixed(1)}%</Text>
                      <Text style={s.breakdownValue}>{formatCurrency(value)}</Text>
                    </View>
                    <View style={s.barBg}>
                      <View style={[s.barFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: cfg.color }]} />
                    </View>
                  </View>
                )
              })}
            </View>
          </Card>
        )}

        {/* Quick actions */}
        <View style={s.actionsRow}>
          {[
            { label: 'Portfolio',     emoji: '📈', route: '/(tabs)/portfolio'    },
            { label: 'Budget',        emoji: '💰', route: '/(tabs)/budget'       },
            { label: 'Transactions',  emoji: '🔄', route: '/(tabs)/transactions' },
            { label: 'Assistant',     emoji: '🤖', route: '/(tabs)/assistant'    },
          ].map(a => (
            <TouchableOpacity
              key={a.route}
              style={s.actionBtn}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 24 }}>{a.emoji}</Text>
              <Text style={s.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },

  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   spacing.sm,
  },
  greeting: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: '700' },
  subtitle: { color: colors.textMuted,   fontSize: fontSize.sm, marginTop: 2 },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      radius.full,
    borderWidth:       1,
    borderColor:       colors.border,
  },

  heroCard:  { alignItems: 'center', paddingVertical: spacing.xl },
  heroLabel: { color: colors.textMuted, fontSize: fontSize.sm, marginBottom: 8 },
  heroValue: {
    color:      colors.textPrimary,
    fontSize:   36,
    fontWeight: '700',
    letterSpacing: -1,
  },
  heroChange: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  changeBadge: { borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  changeSub: { color: colors.textMuted, fontSize: fontSize.xs },

  statsRow: { flexDirection: 'row', gap: spacing.sm },

  sectionTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: '600' },

  breakdownRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
    marginBottom:   4,
  },
  breakdownEmoji: { fontSize: 16, width: 24 },
  breakdownLabel: { flex: 1, color: colors.textSecondary, fontSize: fontSize.sm },
  breakdownPct:   { color: colors.textMuted,    fontSize: fontSize.xs, width: 40, textAlign: 'right' },
  breakdownValue: { color: colors.textPrimary,  fontSize: fontSize.sm, fontWeight: '600', width: 100, textAlign: 'right' },
  barBg: {
    height: 4, backgroundColor: colors.surface2,
    borderRadius: radius.full, overflow: 'hidden',
  },
  barFill: { height: 4, borderRadius: radius.full },

  actionsRow: {
    flexDirection:  'row',
    gap:            spacing.sm,
    flexWrap:       'wrap',
  },
  actionBtn: {
    flex:            1,
    minWidth:        '45%' as any,
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.md,
    alignItems:      'center',
    gap:             6,
  },
  actionLabel: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: '500' },
})

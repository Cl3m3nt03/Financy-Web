import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, radius, spacing } from '@/constants/theme'
import { formatCurrency } from '@/lib/api'

const MILESTONES = [
  { value: 1_000,     label: '1 000 €',       emoji: '🌱' },
  { value: 5_000,     label: '5 000 €',       emoji: '💡' },
  { value: 10_000,    label: '10 000 €',      emoji: '⭐' },
  { value: 25_000,    label: '25 000 €',      emoji: '🔥' },
  { value: 50_000,    label: '50 000 €',      emoji: '💎' },
  { value: 100_000,   label: '100 000 €',     emoji: '🏆' },
  { value: 250_000,   label: '250 000 €',     emoji: '🦁' },
  { value: 500_000,   label: '500 000 €',     emoji: '🚀' },
  { value: 1_000_000, label: '1 000 000 €',   emoji: '👑' },
]

interface Props {
  totalWealth: number
}

export function Milestones({ totalWealth }: Props) {
  const { achieved, next } = useMemo(() => {
    const achieved = MILESTONES.filter(m => totalWealth >= m.value)
    const next     = MILESTONES.find(m => totalWealth < m.value) ?? null
    return { achieved, next }
  }, [totalWealth])

  const lastAchieved = achieved[achieved.length - 1] ?? null
  const progressPct  = next && lastAchieved
    ? Math.min(((totalWealth - lastAchieved.value) / (next.value - lastAchieved.value)) * 100, 100)
    : next
    ? Math.min((totalWealth / next.value) * 100, 100)
    : 100

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Ionicons name="trophy-outline" size={16} color={colors.accent} />
        <Text style={s.title}>Paliers patrimoniaux</Text>
      </View>

      <Text style={s.currentLevel}>
        {lastAchieved
          ? `Niveau ${achieved.length} — ${lastAchieved.emoji} ${lastAchieved.label}`
          : 'Commencez votre parcours'}
      </Text>

      {next && (
        <View style={s.progressSection}>
          <View style={s.labelsRow}>
            <Text style={s.nextLabel}>Prochain : {next.emoji} {next.label}</Text>
            <Text style={s.pctLabel}>{progressPct.toFixed(1)}%</Text>
          </View>
          <View style={s.barBg}>
            <View style={[s.barFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={s.remaining}>
            Plus que{' '}
            <Text style={s.remainingValue}>{formatCurrency(next.value - totalWealth)}</Text>
            {' '}pour atteindre {next.label}
          </Text>
        </View>
      )}

      {next === null && (
        <Text style={s.completeText}>
          Félicitations, vous avez atteint tous les paliers ! 👑
        </Text>
      )}

      <View style={s.badgesRow}>
        {MILESTONES.map(m => {
          const done = totalWealth >= m.value
          return (
            <View
              key={m.value}
              style={[s.badge, done ? s.badgeDone : s.badgeLocked]}
            >
              <Text style={s.badgeEmoji}>{m.emoji}</Text>
              <Text style={[s.badgeLabel, done ? s.badgeLabelDone : s.badgeLabelLocked]}>{m.label}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  title: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: '600' },
  currentLevel: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '500', marginBottom: 12 },
  progressSection: { gap: 8, marginBottom: 16 },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nextLabel: { color: colors.textMuted, fontSize: fontSize.xs },
  pctLabel: { color: colors.accent, fontSize: fontSize.xs, fontWeight: '700' },
  barBg: { height: 6, backgroundColor: colors.surface2, borderRadius: radius.full, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: colors.accent, borderRadius: radius.full },
  remaining: { color: colors.textMuted, fontSize: 10 },
  remainingValue: { color: colors.textSecondary, fontWeight: '600' },
  completeText: { color: colors.success, fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center', marginVertical: 12 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.md, borderWidth: 1 },
  badgeDone: { backgroundColor: colors.accent + '10', borderColor: colors.accent + '30' },
  badgeLocked: { backgroundColor: colors.surface2, borderColor: colors.border, opacity: 0.5 },
  badgeEmoji: { fontSize: 12 },
  badgeLabel: { fontSize: 10, fontWeight: '600' },
  badgeLabelDone: { color: colors.accent },
  badgeLabelLocked: { color: colors.textMuted },
})

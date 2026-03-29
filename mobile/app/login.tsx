import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { colors, fontSize, radius, spacing } from '@/constants/theme'
import { useAuthStore } from '@/lib/store'
import { API_BASE } from '@/constants/api'

export default function LoginScreen() {
  const { setAuth } = useAuthStore()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleLogin() {
    if (!email.trim() || !password) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/mobile`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        Alert.alert('Erreur', data.error ?? 'Identifiants invalides.')
        return
      }
      await setAuth(data.token, data.user)
      router.replace('/(tabs)')
    } catch {
      Alert.alert('Erreur', 'Impossible de se connecter au serveur.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Logo */}
      <View style={s.logo}>
        <View style={s.logoIcon}>
          <Text style={s.logoSymbol}>F</Text>
        </View>
        <Text style={s.logoText}>Financy</Text>
        <Text style={s.logoSub}>Gestion de patrimoine</Text>
      </View>

      {/* Form */}
      <View style={s.form}>
        <Text style={s.label}>Email</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          placeholder="votre@email.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md }}>
          <Text style={s.label}>Mot de passe</Text>
          <TouchableOpacity onPress={() => router.push('/forgot-password')}>
            <Text style={{ color: colors.accent, fontSize: 12 }}>Mot de passe oublié ?</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
        />

        <TouchableOpacity
          style={[s.btn, loading && { opacity: 0.6 }]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color={colors.background} />
            : <Text style={s.btnText}>Se connecter</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.background,
    justifyContent:  'center',
    paddingHorizontal: spacing.xl,
  },
  logo: {
    alignItems:   'center',
    marginBottom: spacing['2xl'],
  },
  logoIcon: {
    width:           64,
    height:          64,
    borderRadius:    radius.xl,
    backgroundColor: colors.accent + '20',
    borderWidth:     1,
    borderColor:     colors.accent + '40',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing.md,
  },
  logoSymbol: {
    color:      colors.accent,
    fontSize:   32,
    fontWeight: '700',
  },
  logoText: {
    color:      colors.textPrimary,
    fontSize:   fontSize['3xl'],
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  logoSub: {
    color:     colors.textMuted,
    fontSize:  fontSize.sm,
    marginTop: 4,
  },
  form: {
    gap: 0,
  },
  label: {
    color:        colors.textSecondary,
    fontSize:     fontSize.sm,
    fontWeight:   '500',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical:   14,
    color:           colors.textPrimary,
    fontSize:        fontSize.md,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius:    radius.md,
    paddingVertical: 16,
    alignItems:      'center',
    marginTop:       spacing.xl,
  },
  btnText: {
    color:      colors.background,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
})

import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { generateOtpCode, sendOtpEmail } from '@/lib/email'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
        totpCode: { label: 'OTP',      type: 'text' },
        ip:       { label: 'IP',       type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const ip = credentials.ip ?? 'unknown'

        const rl = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)
        if (!rl.success) throw new Error('RATE_LIMITED')

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        if (!user) {
          await bcrypt.compare(credentials.password, '$2b$10$invalid.hash.for.timing')
          throw new Error('INVALID_CREDENTIALS')
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) {
          await prisma.loginAttempt.create({
            data: { userId: user.id, email: user.email, ip, success: false },
          }).catch(() => {})
          throw new Error('INVALID_CREDENTIALS')
        }

        // ── 2FA par email ──────────────────────────────────────────────────
        if (user.twoFactorEnabled) {
          if (!credentials.totpCode) {
            // Générer et envoyer un nouveau code
            const code = generateOtpCode()
            const expiry = new Date(Date.now() + 10 * 60 * 1000)
            await prisma.user.update({
              where: { id: user.id },
              data: { emailOtpCode: code, emailOtpExpiry: expiry },
            })
            await sendOtpEmail(user.email, code)
            throw new Error('OTP_REQUIRED')
          }

          if (!user.emailOtpCode || !user.emailOtpExpiry) {
            throw new Error('OTP_REQUIRED')
          }
          if (new Date() > user.emailOtpExpiry) {
            throw new Error('OTP_EXPIRED')
          }
          if (credentials.totpCode !== user.emailOtpCode) {
            throw new Error('INVALID_OTP')
          }

          // Code valide — on l'efface
          await prisma.user.update({
            where: { id: user.id },
            data: { emailOtpCode: null, emailOtpExpiry: null },
          })
        }

        await prisma.loginAttempt.create({
          data: { userId: user.id, email: user.email, ip, success: true },
        }).catch(() => {})

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string
      }
      return session
    },
  },
}

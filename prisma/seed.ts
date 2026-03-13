import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10)

  const user = await prisma.user.upsert({
    where: { email: 'demo@wealthtracker.app' },
    update: {},
    create: {
      email: 'demo@wealthtracker.app',
      password: hashedPassword,
      name: 'Demo User',
    },
  })

  console.log('Seed completed. Demo user:', user.email)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

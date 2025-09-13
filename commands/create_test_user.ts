import { BaseCommand } from '@adonisjs/core/ace'
import User from '#models/user'
import CreditScore from '#models/credit_score'
import hash from '@adonisjs/core/services/hash'
import { DateTime } from 'luxon'

export default class CreateTestUser extends BaseCommand {
  static commandName = 'create:test-user'
  static description = 'Create a test user for debugging'

  async run() {
    this.logger.info('Creating test user...')

    try {
      // Eliminar usuario existente si existe
      const existingUser = await User.findBy('email', 'jose.ramirez@test.com')
      if (existingUser) {
        await existingUser.delete()
        this.logger.info('Existing user deleted')
      }

      // Crear usuario nuevo
      const user = await User.create({
        firstName: 'José',
        lastName: 'Ramírez',
        email: 'jose.ramirez@test.com',
        password: await hash.make('password123'),
        phone: '+52 55 3456-7890',
        role: 'comprador',
        status: 'active',
      })

      this.logger.success(`✅ User created: ${user.email}`)
      this.logger.info(`   ID: ${user.id}`)
      this.logger.info(`   Role: ${user.role}`)

      // Crear score crediticio
      const creditScore = await CreditScore.create({
        userId: user.id,
        creditScore: 620,
        estimatedIncome: 45000,
        maxBudget: CreditScore.calculateMaxBudget(620, 45000),
        riskLevel: 'medium',
        bureauReportId: 'BC-620-003',
        notes: 'Historial regular, algunos atrasos menores',
        isActive: true,
        checkedAt: DateTime.now(),
        expiresAt: DateTime.now().plus({ months: 6 }),
      })

      this.logger.success(`✅ Credit score created: ${creditScore.creditScore}`)

      // Probar login
      const testUser = await User.verifyCredentials('jose.ramirez@test.com', 'password123')
      this.logger.success('✅ Login test PASSED!')
      this.logger.info(`   Verified user: ${testUser.email}`)

    } catch (error) {
      this.logger.error('❌ Error creating test user:')
      this.logger.error(error.message)
    }
  }
}
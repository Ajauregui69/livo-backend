import { BaseCommand } from '@adonisjs/core/ace'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'

export default class CheckUsers extends BaseCommand {
  static commandName = 'check:users'
  static description = 'Check test users and verify passwords'

  async run() {
    this.logger.info('Checking test users...')

    const testEmails = [
      'carlos.mendoza@test.com',
      'maria.gonzalez@test.com', 
      'jose.ramirez@test.com',
      'ana.lopez@test.com',
      'roberto.hernandez@test.com',
      'sofia.morales@test.com',
      'eduardo.castillo@test.com',
      'paola.ruiz@test.com'
    ]

    for (const email of testEmails) {
      const user = await User.findBy('email', email)
      
      if (user) {
        // Test password verification
        const isValidPassword = await hash.verify(user.password, 'password123')
        
        this.logger.info(`✅ ${email}`)
        this.logger.info(`   Role: ${user.role}`)
        this.logger.info(`   Status: ${user.status}`)
        this.logger.info(`   Password Valid: ${isValidPassword ? '✅ YES' : '❌ NO'}`)
        this.logger.info('---')
      } else {
        this.logger.error(`❌ User ${email} NOT FOUND`)
      }
    }

    // Test login manually
    try {
      const testUser = await User.verifyCredentials('jose.ramirez@test.com', 'password123')
      this.logger.success('✅ Manual login test PASSED for jose.ramirez@test.com')
      this.logger.info(`   User ID: ${testUser.id}`)
      this.logger.info(`   Role: ${testUser.role}`)
    } catch (error) {
      this.logger.error('❌ Manual login test FAILED for jose.ramirez@test.com')
      this.logger.error(`   Error: ${error.message}`)
    }
  }
}
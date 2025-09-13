import { BaseCommand } from '@adonisjs/core/ace'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'

export default class FixPasswords extends BaseCommand {
  static commandName = 'fix:passwords'
  static description = 'Fix password hashes for all test users'

  async run() {
    this.logger.info('🔧 FIXING PASSWORD HASHES')
    
    const testUsers = [
      'carlos.mendoza@test.com',
      'maria.gonzalez@test.com',
      'jose.ramirez@test.com',
      'ana.lopez@test.com',
      'roberto.hernandez@test.com',
      'sofia.morales@test.com',
      'eduardo.castillo@test.com',
      'paola.ruiz@test.com'
    ]

    for (const email of testUsers) {
      try {
        const user = await User.findBy('email', email)
        
        if (user) {
          this.logger.info(`🔍 Fixing password for: ${email}`)
          
          // Generate new hash for 'password123'
          const newPasswordHash = await hash.make('password123')
          
          // Update user with new hash
          user.password = newPasswordHash
          await user.save()
          
          // Test the new hash
          const isValid = await hash.verify(user.password, 'password123')
          
          this.logger.success(`✅ ${email} - Password ${isValid ? 'FIXED' : 'STILL BROKEN'}`)
          
          // Test verifyCredentials
          try {
            await User.verifyCredentials(email, 'password123')
            this.logger.success(`🔐 ${email} - verifyCredentials WORKS!`)
          } catch (error) {
            this.logger.error(`❌ ${email} - verifyCredentials FAILED: ${error.message}`)
          }
          
        } else {
          this.logger.error(`❌ User not found: ${email}`)
        }
        
        this.logger.info('---')
        
      } catch (error) {
        this.logger.error(`❌ Error fixing ${email}: ${error.message}`)
      }
    }
    
    this.logger.success('🎉 Password fix process completed!')
  }
}
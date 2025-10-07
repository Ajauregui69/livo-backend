// @ts-nocheck
import { BaseCommand } from '@adonisjs/core/ace'
import { type CommandOptions } from '@adonisjs/core/types'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'

export default class TestUserCreation extends BaseCommand {
  static commandName = 'test:user'
  static description = 'Test user creation and password verification'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Testing user creation...')

    try {
      // Delete existing test user
      const existingUser = await User.findBy('email', 'test@example.com')
      if (existingUser) {
        await existingUser.delete()
        this.logger.info('Deleted existing test user')
      }

      // Create new user using User.create (like in seeders)
      this.logger.info('Creating user with User.create...')
      const user = await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123', // Let AdonisJS handle hashing
        role: 'comprador',
        status: 'active'
      })

      this.logger.success(`✅ User created with ID: ${user.id}`)

      // Test password verification
      this.logger.info('Testing password verification...')
      const isValid = await hash.verify(user.password, 'password123')
      this.logger.info(`Hash verification result: ${isValid}`)

      // Test verifyCredentials
      this.logger.info('Testing User.verifyCredentials...')
      try {
        const verifiedUser = await User.verifyCredentials('test@example.com', 'password123')
        this.logger.success('✅ verifyCredentials WORKED!')
        this.logger.info(`Verified user: ${verifiedUser.email}`)
      } catch (error) {
        this.logger.error(`❌ verifyCredentials FAILED: ${error.message}`)
      }

      // Now test the problematic user from seeder
      this.logger.info('\nTesting seeder user...')
      const seederUser = await User.findBy('email', 'jose.ramirez@test.com')
      if (seederUser) {
        this.logger.info('Testing seeder user password...')
        const seederPasswordValid = await hash.verify(seederUser.password, 'password123')
        this.logger.info(`Seeder user hash verification: ${seederPasswordValid}`)
        
        try {
          await User.verifyCredentials('jose.ramirez@test.com', 'password123')
          this.logger.success('✅ Seeder user verifyCredentials WORKED!')
        } catch (error) {
          this.logger.error(`❌ Seeder user verifyCredentials FAILED: ${error.message}`)
          
          // Let's fix this user
          this.logger.info('Fixing seeder user password...')
          seederUser.password = 'password123' // Let model hash it
          await seederUser.save()
          this.logger.info('Seeder user password updated, testing again...')
          
          try {
            await User.verifyCredentials('jose.ramirez@test.com', 'password123')
            this.logger.success('✅ Fixed seeder user now works!')
          } catch (error) {
            this.logger.error(`❌ Still not working: ${error.message}`)
          }
        }
      }

    } catch (error) {
      this.logger.error(`Error: ${error.message}`)
    }
  }
}
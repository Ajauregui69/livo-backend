import { BaseCommand } from '@adonisjs/core/ace'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import vine from '@vinejs/vine'

export default class DebugLogin extends BaseCommand {
  static commandName = 'debug:login'
  static description = 'Debug login process step by step'

  async run() {
    const email = 'jose.ramirez@test.com'
    const password = 'password123'

    this.logger.info('🔍 DEBUGGING LOGIN PROCESS')
    this.logger.info('========================')
    
    // Step 1: Check if user exists
    this.logger.info('1. Checking if user exists...')
    const user = await User.findBy('email', email)
    
    if (!user) {
      this.logger.error('❌ USER NOT FOUND!')
      return
    }
    
    this.logger.success(`✅ User found: ${user.email}`)
    this.logger.info(`   ID: ${user.id}`)
    this.logger.info(`   Role: ${user.role}`)
    this.logger.info(`   Status: ${user.status}`)
    
    // Step 2: Check password hash
    this.logger.info('\n2. Testing password verification...')
    this.logger.info(`   Stored hash: ${user.password.substring(0, 50)}...`)
    this.logger.info(`   Testing password: "${password}"`)
    
    try {
      const isValid = await hash.verify(user.password, password)
      this.logger.info(`   Hash verification: ${isValid ? '✅ VALID' : '❌ INVALID'}`)
    } catch (error) {
      this.logger.error(`   Hash verification ERROR: ${error.message}`)
    }
    
    // Step 3: Test email normalization
    this.logger.info('\n3. Testing email normalization...')
    const loginValidator = vine.compile(
      vine.object({
        email: vine.string().email().normalizeEmail(),
        password: vine.string()
      })
    )
    
    try {
      const validatedData = await loginValidator.validate({ email, password })
      this.logger.success(`✅ Validation passed`)
      this.logger.info(`   Original email: ${email}`)
      this.logger.info(`   Normalized email: ${validatedData.email}`)
      
      // Check if normalized email matches
      if (validatedData.email !== email) {
        this.logger.warning('⚠️  Email normalization changed the email!')
        const userByNormalized = await User.findBy('email', validatedData.email)
        if (userByNormalized) {
          this.logger.info(`   Found user with normalized email: ${userByNormalized.email}`)
        }
      }
    } catch (error) {
      this.logger.error(`❌ Validation failed: ${error.message}`)
    }
    
    // Step 4: Test User.verifyCredentials directly
    this.logger.info('\n4. Testing User.verifyCredentials...')
    try {
      const verifiedUser = await User.verifyCredentials(email, password)
      this.logger.success(`✅ verifyCredentials PASSED!`)
      this.logger.info(`   Verified user: ${verifiedUser.email}`)
    } catch (error) {
      this.logger.error(`❌ verifyCredentials FAILED: ${error.message}`)
    }
    
    // Step 5: Manual hash comparison
    this.logger.info('\n5. Creating fresh hash for comparison...')
    const freshHash = await hash.make(password)
    this.logger.info(`   Fresh hash: ${freshHash.substring(0, 50)}...`)
    
    const freshHashValid = await hash.verify(freshHash, password)
    this.logger.info(`   Fresh hash verification: ${freshHashValid ? '✅ VALID' : '❌ INVALID'}`)
    
    // Step 6: Show all user details
    this.logger.info('\n6. Full user details:')
    this.logger.info(JSON.stringify({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }, null, 2))
  }
}
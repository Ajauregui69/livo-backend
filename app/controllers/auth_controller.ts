import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
import Agent from '#models/agent'
import Agency from '#models/agency'
import EmailVerificationToken from '#models/email_verification_token'
import VerifyEmailMail from '#mails/verify_email_mail'
import mail from '@adonisjs/mail/services/main'
import { loginValidator, registerValidator } from '#validators/auth'
import { updateProfileValidator } from '#validators/update_profile'

export default class AuthController {
  /**
   * Register a new user
   */
  async register({ request, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)
    
    try {
      // For direct registration (non-OAuth), set status as 'pending' until email is verified
      const userData = {
        ...payload,
        status: 'pending', // User needs to verify email
        emailVerifiedAt: null
      }

      const user = await User.create(userData)
      
      let emailSent = false
      let verificationToken = null
      
      try {
        // Generate verification token and send email (optional)
        verificationToken = await EmailVerificationToken.createForUser(user.id, user.email)

        // Try to send verification email (skip if SMTP not configured)
        // For production: Configure proper SMTP credentials in .env
        // For development: MailHog/Mailpit can be used on localhost:1025, or this will auto-activate users
        await mail.send(new VerifyEmailMail(user, verificationToken.token))
        emailSent = true
      } catch (emailError) {
        console.log('Email not sent (SMTP not configured):', emailError.message)
        // For development/testing, mark user as active if email can't be sent
        // This allows development to work without requiring SMTP setup
        user.status = 'active'
        user.emailVerifiedAt = DateTime.now()
        await user.save()
      }

      return response.status(201).json({
        message: emailSent 
          ? 'Usuario registrado exitosamente. Por favor, revisa tu correo electrónico para verificar tu cuenta.'
          : 'Usuario registrado exitosamente. Email de verificación no enviado (SMTP no configurado).',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          status: user.status,
          companyName: user.companyName,
          licenseNumber: user.licenseNumber,
          emailVerified: !!user.emailVerifiedAt
        },
        requiresEmailVerification: emailSent && !user.emailVerifiedAt,
        emailSent
      })
    } catch (error) {
      return response.status(400).json({
        message: 'Error al registrar usuario',
        error: error.message
      })
    }
  }

  /**
   * Login user
   */
  async login({ request, response }: HttpContext) {
    console.log('🔍 LOGIN ATTEMPT STARTED')
    
    try {
      const body = request.body()
      console.log('📝 Request body:', body)
      
      const { email, password } = await request.validateUsing(loginValidator)
      console.log('✅ Validation passed:', { email, password: '***' })
      
      // First check if it's a user
      const userExists = await User.findBy('email', email)
      console.log('👤 User found:', userExists ? 'YES' : 'NO')
      
      if (userExists) {
        console.log('📋 User details:', {
          id: userExists.id,
          email: userExists.email,
          role: userExists.role,
          status: userExists.status,
          emailVerifiedAt: userExists.emailVerifiedAt
        })

        // Check if user is pending email verification (only for non-OAuth users)
        if (userExists.status === 'pending' && !userExists.oauthProvider) {
          return response.status(403).json({
            message: 'Tu cuenta aún no ha sido verificada. Por favor, revisa tu correo electrónico.',
            requiresEmailVerification: true,
            canResendEmail: true
          })
        }
        
        // Handle agent and agency_admin roles uniformly
        if (userExists.role === 'agent' || userExists.role === 'agency_admin') {
          console.log('🏢 User has agent/agency_admin role - using standard verification')

          // Use standard user verification for both agents and agency admins
          const user = await User.verifyCredentials(email, password)
          console.log('🔐 Agent/Agency admin credentials verified!')

          const token = await User.accessTokens.create(user)
          console.log('🎫 Agent/Agency admin token created successfully')

          // Determine display role - agency_admin users show as 'admin' in frontend
          const displayRole = user.role === 'agency_admin' ? 'admin' : user.role

          return response.json({
            message: 'Login exitoso',
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              role: displayRole,
              status: user.status,
              companyName: user.companyName,
              licenseNumber: user.licenseNumber,
              emailVerified: !!user.emailVerifiedAt
            },
            token: token.value!.release()
          })
        }
        
        // Login as regular user
        const user = await User.verifyCredentials(email, password)
        console.log('🔐 User verifyCredentials passed!')
        
        const token = await User.accessTokens.create(user)
        console.log('🎫 User token created successfully')

        return response.json({
          message: 'Login exitoso',
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            status: user.status,
            companyName: user.companyName,
            licenseNumber: user.licenseNumber,
            emailVerified: !!user.emailVerifiedAt
          },
          token: token.value!.release()
        })
      }
      
      // If no user found, check if there's an agent that needs migration
      console.log('🔍 No user found, checking if agent exists for migration...')
      const orphanAgent = await Agent.findBy('email', email)
      
      if (orphanAgent) {
        console.log('🏢 Found orphan agent that needs user record:', {
          id: orphanAgent.id,
          name: orphanAgent.name,
          email: orphanAgent.email
        })
        
        // Verify agent password first
        const isValidPassword = await orphanAgent.verifyPassword(password)
        if (!isValidPassword) {
          return response.status(401).json({
            message: 'Credenciales inválidas'
          })
        }
        
        console.log('🔐 Orphan agent password verified - creating user record...')
        
        try {
          // Create user record for this orphan agent
          const newUser = await User.create({
            id: orphanAgent.id,
            firstName: orphanAgent.name,
            lastName: '',
            email: orphanAgent.email,
            password: orphanAgent.password, // Use the same hashed password
            role: 'agent',
            status: 'active',
            emailVerifiedAt: DateTime.now()
          })
          
          console.log('✅ Created user record for orphan agent')
          
          // Load agency information
          await orphanAgent.load('agency')
          
          // Create token
          const token = await User.accessTokens.create(newUser)
          console.log('🎫 Token created for migrated agent')
          
          return response.json({
            message: 'Login de agente exitoso (migración automática completada)',
            user: {
              id: orphanAgent.id,
              firstName: orphanAgent.name,
              lastName: '',
              name: orphanAgent.name,
              email: orphanAgent.email,
              role: 'agent',
              isAgent: true,
              agency: orphanAgent.agency,
              isActive: orphanAgent.isActive,
              company: orphanAgent.company
            },
            token: token.value!.release()
          })
          
        } catch (createUserError) {
          console.log('❌ Failed to create user record for orphan agent:', createUserError)
          return response.status(500).json({
            message: 'Error interno: No se pudo crear registro de usuario. Contacta al administrador.'
          })
        }
      }
      
      console.log('❌ No user or agent found with email:', email)
      throw new Error('Invalid credentials')
    } catch (error) {
      console.log('❌ LOGIN ERROR:', error.message)
      console.log('🔧 Error details:', error)
      
      return response.status(401).json({
        message: 'Credenciales inválidas',
        debug: error.message // Temporal para debug
      })
    }
  }

  /**
   * Get authenticated user
   */
  async me({ auth, response }: HttpContext) {
    const user = auth.user!

    // Determine display role - agency_admin users show as 'admin' in frontend
    const displayRole = user.role === 'agency_admin' ? 'admin' : user.role

    return response.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: displayRole,
        status: user.status,
        companyName: user.companyName,
        licenseNumber: user.licenseNumber,
        monthlyIncome: user.monthlyIncome,
        employment: user.employment,
        workYears: user.workYears,
        address: user.address,
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
        emailVerified: !!user.emailVerifiedAt
      }
    })
  }

  /**
   * Logout user
   */
  async logout({ auth, response }: HttpContext) {
    const user = auth.user!
    await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    
    return response.json({
      message: 'Logout exitoso'
    })
  }

  /**
   * Update user profile
   */
  async updateProfile({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(updateProfileValidator)

    try {
      user.merge(payload)
      await user.save()

      return response.json({
        message: 'Perfil actualizado exitosamente',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          companyName: user.companyName,
          licenseNumber: user.licenseNumber,
          monthlyIncome: user.monthlyIncome,
          employment: user.employment,
          workYears: user.workYears,
          address: user.address,
          city: user.city,
          state: user.state,
          zipCode: user.zipCode,
          emailVerified: !!user.emailVerifiedAt
        }
      })
    } catch (error) {
      return response.status(400).json({
        message: 'Error al actualizar perfil',
        error: error.message
      })
    }
  }

  /**
   * Redirect to OAuth provider
   */
  async redirect({ ally, params, response }: HttpContext) {
    const provider = params.provider
    
    if (!['google', 'facebook', 'apple'].includes(provider)) {
      return response.status(400).json({
        message: 'Proveedor no válido'
      })
    }

    return ally.use(provider).redirect()
  }

  /**
   * Handle OAuth callback
   */
  async callback({ ally, params, response }: HttpContext) {
    const provider = params.provider
    
    if (!['google', 'facebook', 'apple'].includes(provider)) {
      return response.status(400).json({
        message: 'Proveedor no válido'
      })
    }

    try {
      const oauthUser = await ally.use(provider).user()
      
      // Check if user already exists
      let user = await User.findBy('email', oauthUser.email)
      
      if (!user) {
        // Create new user from OAuth data
        user = await User.create({
          firstName: oauthUser.name?.split(' ')[0] || 'Usuario',
          lastName: oauthUser.name?.split(' ').slice(1).join(' ') || '',
          email: oauthUser.email!,
          password: Math.random().toString(36), // Random password for OAuth users
          role: 'comprador', // Default role
          status: 'active',
          emailVerifiedAt: DateTime.now(), // OAuth users are considered verified
          oauthProvider: provider,
          oauthId: oauthUser.id,
        })
      } else if (!user.oauthProvider) {
        // Link existing user with OAuth
        user.oauthProvider = provider
        user.oauthId = oauthUser.id
        await user.save()
      }

      const token = await User.accessTokens.create(user)

      // Redirect to frontend with token
      return response.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${token.value!.release()}&user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status
      }))}`)

    } catch (error) {
      console.error('OAuth callback error:', error)
      return response.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?message=${encodeURIComponent('Error en la autenticación')}`)
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail({ request, response }: HttpContext) {
    const { token } = request.qs()
    
    if (!token) {
      return response.status(400).json({
        message: 'Token de verificación requerido'
      })
    }

    try {
      const verificationToken = await EmailVerificationToken.findValidToken(token)
      
      if (!verificationToken) {
        return response.status(400).json({
          message: 'Token de verificación inválido o expirado'
        })
      }

      const user = await User.find(verificationToken.userId)
      
      if (!user) {
        return response.status(404).json({
          message: 'Usuario no encontrado'
        })
      }

      // Mark user as verified
      user.emailVerifiedAt = DateTime.now()
      user.status = 'active'
      await user.save()

      // Mark token as used
      verificationToken.used = true
      await verificationToken.save()

      return response.json({
        message: 'Email verificado exitosamente',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          status: user.status,
          emailVerified: true
        }
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al verificar email',
        error: error.message
      })
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail({ request, response }: HttpContext) {
    const { email } = request.only(['email'])
    
    if (!email) {
      return response.status(400).json({
        message: 'Email requerido'
      })
    }

    try {
      const user = await User.findBy('email', email)
      
      if (!user) {
        return response.status(404).json({
          message: 'Usuario no encontrado'
        })
      }

      if (user.emailVerifiedAt) {
        return response.status(400).json({
          message: 'Este email ya está verificado'
        })
      }

      // Invalidate existing tokens for this user
      await EmailVerificationToken.query()
        .where('user_id', user.id)
        .where('used', false)
        .update({ used: true })

      // Create new verification token
      const verificationToken = await EmailVerificationToken.createForUser(user.id, user.email)
      
      // Send verification email
      await mail.send(new VerifyEmailMail(user, verificationToken.token))

      return response.json({
        message: 'Email de verificación enviado exitosamente'
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al enviar email de verificación',
        error: error.message
      })
    }
  }
}
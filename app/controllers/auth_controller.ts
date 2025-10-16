import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
// import Agent from '#models/agent'
// import Agency from '#models/agency'
import EmailVerificationToken from '#models/email_verification_token'
import VerifyEmailMail from '#mails/verify_email_mail'
import mail from '@adonisjs/mail/services/main'
import SendGridService from '#services/sendgrid_service'
import { loginValidator, registerValidator } from '#validators/auth'
import { updateProfileValidator } from '#validators/update_profile'
import db from '@adonisjs/lucid/services/db'

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
        status: 'pending' as const, // User needs to verify email
        emailVerifiedAt: null
      }

      const user = await User.create(userData)

      let verificationToken = null

      let emailSent = false

      try {
        // Generate verification token
        verificationToken = await EmailVerificationToken.createForUser(user.id, user.email)

        // Try to send verification email with timeout (10 seconds) using SendGrid API
        const emailPromise = SendGridService.sendVerificationEmail(
          user.email,
          user.firstName,
          verificationToken.token
        )
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Email timeout')), 10000)
        )

        await Promise.race([emailPromise, timeoutPromise])
        emailSent = true
      } catch (emailError) {
        console.log(`${DateTime.now().toISO()}: Email not sent:`, emailError.message)

        // En desarrollo, auto-verificar si el email falla
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️  DEVELOPMENT MODE: Auto-verificando usuario porque el email falló')
          user.status = 'active'
          user.emailVerifiedAt = DateTime.now()
          await user.save()

          // Crear token de acceso para login automático
          const token = await User.accessTokens.create(user)

          return response.status(201).json({
            message: 'Usuario registrado exitosamente (email no enviado pero verificado automáticamente en desarrollo).',
            requiresEmailVerification: false,
            emailSent: false,
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              role: user.role,
              status: user.status
            },
            token: token.value!.release()
          })
        }

        // En producción, solo marcar que el email falló
        emailSent = false
      }

      // Usuario creado exitosamente (con o sin email)
      return response.status(201).json({
        message: emailSent
          ? 'Usuario registrado exitosamente. Por favor, revisa tu correo electrónico para verificar tu cuenta.'
          : 'Usuario registrado exitosamente. El correo de verificación no pudo ser enviado, pero puedes solicitarlo nuevamente desde el login.',
        requiresEmailVerification: true,
        emailSent: emailSent,
        email: user.email,
        redirectToLogin: true
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

      // Legacy: Agent migration code removed - all agents must have user records now
      console.log('❌ No user found with email:', email)
      throw new Error('Invalid credentials')

      /* LEGACY CODE - COMMENTED OUT
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
      */
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

  /**
   * Request password reset
   */
  async forgotPassword({ request, response }: HttpContext) {
    const { email } = request.only(['email'])

    if (!email) {
      return response.status(400).json({
        message: 'Email requerido'
      })
    }

    try {
      const user = await User.findBy('email', email)

      // Always return success to prevent email enumeration
      if (!user) {
        return response.json({
          message: 'Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.'
        })
      }

      // Invalidate existing password reset tokens for this user
      await EmailVerificationToken.query()
        .where('user_id', user.id)
        .where('type', 'password_reset')
        .where('used', false)
        .update({ used: true })

      // Create new password reset token (expires in 1 hour)
      const resetToken = await EmailVerificationToken.create({
        userId: user.id,
        email: user.email,
        token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        type: 'password_reset',
        expiresAt: DateTime.now().plus({ hours: 1 }),
        used: false
      })

      console.log('🔑 Token creado:', {
        token: resetToken.token,
        userId: resetToken.userId,
        type: resetToken.type,
        expiresAt: resetToken.expiresAt,
        used: resetToken.used
      })

      // Send password reset email using SendGrid
      try {
        await SendGridService.sendPasswordResetEmail(
          user.email,
          user.firstName,
          resetToken.token
        )
        console.log('📧 Email enviado a:', user.email)
      } catch (emailError) {
        console.error('❌ Error sending password reset email:', emailError)
        console.error('❌ Email error details:', emailError.message, emailError.stack)
        // Continue anyway to prevent email enumeration
        // Token is created and saved in database, user can potentially use it if we add manual token entry
      }

      return response.json({
        message: 'Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.'
      })
    } catch (error) {
      console.error('Forgot password error:', error)
      return response.status(500).json({
        message: 'Error al procesar la solicitud',
        error: error.message
      })
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword({ request, response }: HttpContext) {
    const { token, password } = request.only(['token', 'password'])

    if (!token || !password) {
      return response.status(400).json({
        message: 'Token y nueva contraseña son requeridos'
      })
    }

    if (password.length < 8) {
      return response.status(400).json({
        message: 'La contraseña debe tener al menos 8 caracteres'
      })
    }

    try {
      // Find password reset token
      const resetToken = await EmailVerificationToken.query()
        .where('token', token)
        .where('type', 'password_reset')
        .where('used', false)
        .first()

      console.log('Token buscado:', token)
      console.log('Token encontrado:', resetToken?.toJSON())
      console.log('Hora actual:', DateTime.now().toISO())

      if (!resetToken) {
        return response.status(400).json({
          message: 'Token inválido o expirado. Por favor, solicita un nuevo enlace de restablecimiento.'
        })
      }

      // Check if token is expired
      if (resetToken.expiresAt && resetToken.expiresAt < DateTime.now()) {
        return response.status(400).json({
          message: 'Token expirado. Por favor, solicita un nuevo enlace de restablecimiento.'
        })
      }

      const user = await User.find(resetToken.userId)

      if (!user) {
        return response.status(404).json({
          message: 'Usuario no encontrado'
        })
      }

      // Update password
      user.password = password

      // If user is pending (not verified), activate them now
      console.log('🔍 User status before reset:', user.status, 'emailVerifiedAt:', user.emailVerifiedAt)
      if (user.status === 'pending') {
        user.status = 'active'
        user.emailVerifiedAt = DateTime.now()
        console.log('✅ User activated during password reset:', user.email)
      }

      await user.save()
      console.log('💾 User saved. New status:', user.status, 'emailVerifiedAt:', user.emailVerifiedAt)

      // Mark token as used
      resetToken.used = true
      await resetToken.save()

      // Invalidate all access tokens for security
      await db.from('auth_access_tokens')
        .where('tokenable_id', user.id)
        .delete()

      return response.json({
        message: 'Contraseña restablecida exitosamente. Todas tus sesiones activas han sido cerradas por seguridad.'
      })
    } catch (error) {
      console.error('Reset password error:', error)
      return response.status(500).json({
        message: 'Error al restablecer la contraseña',
        error: error.message
      })
    }
  }
}
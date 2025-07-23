import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { loginValidator, registerValidator } from '#validators/auth'

export default class AuthController {
  /**
   * Register a new user
   */
  async register({ request, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)
    
    try {
      const user = await User.create(payload)
      const token = await User.accessTokens.create(user)

      return response.status(201).json({
        message: 'Usuario registrado exitosamente',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          status: user.status,
          companyName: user.companyName,
          licenseNumber: user.licenseNumber
        },
        token: token.value!.release()
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
    const { email, password } = await request.validateUsing(loginValidator)
    
    try {
      const user = await User.verifyCredentials(email, password)
      const token = await User.accessTokens.create(user)

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
          licenseNumber: user.licenseNumber
        },
        token: token.value!.release()
      })
    } catch (error) {
      return response.status(401).json({
        message: 'Credenciales inválidas'
      })
    }
  }

  /**
   * Get authenticated user
   */
  async me({ auth, response }: HttpContext) {
    const user = auth.user!
    
    return response.json({
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
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt
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
    const payload = request.only([
      'firstName', 
      'lastName', 
      'phone', 
      'companyName', 
      'licenseNumber',
      'preferences'
    ])

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
          licenseNumber: user.licenseNumber
        }
      })
    } catch (error) {
      return response.status(400).json({
        message: 'Error al actualizar perfil',
        error: error.message
      })
    }
  }
}
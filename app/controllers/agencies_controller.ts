import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { cuid } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'
import Agency from '#models/agency'
import Agent from '#models/agent'
import User from '#models/user'
import { createAgencyValidator, updateAgencyValidator } from '#validators/agency'

export default class AgenciesController {
  /**
   * Display a list of agencies
   */
  async index({ request, response }: HttpContext) {
    try {
      const page = request.input('page', 1)
      const limit = request.input('limit', 10)
      const search = request.input('search')
      const city = request.input('city')

      const query = Agency.query().preload('admin').preload('agents')

      if (search) {
        query.where('name', 'like', `%${search}%`)
      }

      if (city) {
        query.where('city', city)
      }

      const agencies = await query.paginate(page, limit)

      return response.ok({
        status: 'success',
        data: agencies
      })
    } catch (error) {
      return response.internalServerError({
        status: 'error',
        message: 'Error retrieving agencies',
        error: error.message
      })
    }
  }

  /**
   * Create a new agency
   */
  async store({ request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const payload = await request.validateUsing(createAgencyValidator)

      // Check if name is unique
      const nameExists = await Agency.query().where('name', payload.name).first()
      if (nameExists) {
        return response.conflict({
          status: 'error',
          message: 'Agency name already exists'
        })
      }

      const agency = await Agency.create({
        ...payload,
        adminUserId: user.id
      })

      await agency.load('admin')

      return response.created({
        status: 'success',
        data: agency,
        message: 'Agency created successfully'
      })
    } catch (error) {
      return response.badRequest({
        status: 'error',
        message: 'Error creating agency',
        error: error.message
      })
    }
  }

  /**
   * Show individual agency
   */
  async show({ params, response }: HttpContext) {
    try {
      const agency = await Agency.query()
        .where('id', params.id)
        .preload('admin')
        .preload('agents')
        .first()

      if (!agency) {
        return response.notFound({
          status: 'error',
          message: 'Agency not found'
        })
      }

      return response.ok({
        status: 'success',
        data: agency
      })
    } catch (error) {
      return response.internalServerError({
        status: 'error',
        message: 'Error retrieving agency',
        error: error.message
      })
    }
  }

  /**
   * Update agency
   */
  async update({ params, request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const payload = await request.validateUsing(updateAgencyValidator)

      const agency = await Agency.find(params.id)

      if (!agency) {
        return response.notFound({
          status: 'error',
          message: 'Agency not found'
        })
      }

      // Check if user is admin of this agency
      if (agency.adminUserId !== user.id) {
        return response.forbidden({
          status: 'error',
          message: 'You are not authorized to update this agency'
        })
      }

      // Check if name is unique (excluding current agency)
      if (payload.name) {
        const nameExists = await Agency.query()
          .where('name', payload.name)
          .whereNot('id', params.id)
          .first()

        if (nameExists) {
          return response.conflict({
            status: 'error',
            message: 'Agency name already exists'
          })
        }
      }

      agency.merge(payload)
      await agency.save()

      await agency.load('admin')
      await agency.load('agents')

      return response.ok({
        status: 'success',
        data: agency,
        message: 'Agency updated successfully'
      })
    } catch (error) {
      return response.badRequest({
        status: 'error',
        message: 'Error updating agency',
        error: error.message
      })
    }
  }

  /**
   * Delete agency
   */
  async destroy({ params, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const agency = await Agency.find(params.id)

      if (!agency) {
        return response.notFound({
          status: 'error',
          message: 'Agency not found'
        })
      }

      // Check if user is admin of this agency
      if (agency.adminUserId !== user.id) {
        return response.forbidden({
          status: 'error',
          message: 'You are not authorized to delete this agency'
        })
      }

      await agency.delete()

      return response.ok({
        status: 'success',
        message: 'Agency deleted successfully'
      })
    } catch (error) {
      return response.internalServerError({
        status: 'error',
        message: 'Error deleting agency',
        error: error.message
      })
    }
  }

  /**
   * Get agencies for the authenticated user
   */
  async myAgencies({ response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()

      const agencies = await Agency.query()
        .where('admin_user_id', user.id)
        .preload('agents')
        .orderBy('created_at', 'desc')

      return response.ok({
        status: 'success',
        data: agencies
      })
    } catch (error) {
      return response.internalServerError({
        status: 'error',
        message: 'Error retrieving your agencies',
        error: error.message
      })
    }
  }

  /**
   * Create agent for agency
   */
  async createAgent({ params, request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const agency = await Agency.find(params.id)

      if (!agency) {
        return response.notFound({
          status: 'error',
          message: 'Agency not found'
        })
      }

      // Check if user is admin of this agency
      if (agency.adminUserId !== user.id) {
        return response.forbidden({
          status: 'error',
          message: 'You are not authorized to create agents for this agency'
        })
      }

      const agentData = request.only([
        'name', 'email', 'password', 'phone1', 'city', 'category', 
        'company', 'brokerAddress', 'officePhone', 'mobilePhone', 
        'website', 'bio', 'socialMedia'
      ])

      const agent = await Agent.create({
        ...agentData,
        agencyId: agency.id,
        role: 'agent',
        isActive: true
      })

      await agent.load('agency')

      return response.created({
        status: 'success',
        data: agent,
        message: 'Agent created successfully'
      })
    } catch (error) {
      return response.badRequest({
        status: 'error',
        message: 'Error creating agent',
        error: error.message
      })
    }
  }

  /**
   * Get agents of an agency
   */
  async getAgents({ params, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const agency = await Agency.find(params.id)

      if (!agency) {
        return response.notFound({
          status: 'error',
          message: 'Agency not found'
        })
      }

      // Check if user is admin of this agency
      if (agency.adminUserId !== user.id) {
        return response.forbidden({
          status: 'error',
          message: 'You are not authorized to view agents of this agency'
        })
      }

      const agents = await Agent.query()
        .where('agency_id', agency.id)
        .preload('agency')
        .orderBy('created_at', 'desc')

      return response.ok({
        status: 'success',
        data: agents
      })
    } catch (error) {
      return response.internalServerError({
        status: 'error',
        message: 'Error retrieving agents',
        error: error.message
      })
    }
  }

  /**
   * Get agents of current user's agency
   */
  async getCurrentAgencyAgents({ response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()

      // Find user's agency
      const agency = await Agency.query()
        .where('admin_user_id', user.id)
        .first()

      if (!agency) {
        return response.notFound({
          status: 'error',
          message: 'You do not have an agency yet'
        })
      }

      const agents = await Agent.query()
        .where('agency_id', agency.id)
        .preload('user')
        .preload('agency')
        .preload('properties')
        .orderBy('created_at', 'desc')

      // Add properties count to each agent
      const agentsWithCount = agents.map(agent => {
        const agentData = agent.toJSON()
        agentData.propertiesCount = agent.properties ? agent.properties.length : 0
        return agentData
      })

      return response.ok({
        status: 'success',
        data: agentsWithCount
      })
    } catch (error) {
      return response.internalServerError({
        status: 'error',
        message: 'Error retrieving agents',
        error: error.message
      })
    }
  }

  /**
   * Create agent for current user's agency
   */
  async createCurrentAgencyAgent({ request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()

      // Find user's agency
      const agency = await Agency.query()
        .where('admin_user_id', user.id)
        .first()

      if (!agency) {
        return response.notFound({
          status: 'error',
          message: 'You do not have an agency yet. Please create an agency first.'
        })
      }

      // Separate user data from agent data
      const userData = request.only([
        'firstName',
        'lastName',
        'email',
        'phone',
        'password'
      ])

      const agentData = request.only([
        'image',
        'city',
        'category',
        'company',
        'brokerAddress',
        'phone1',
        'phone2',
        'officePhone',
        'mobilePhone',
        'fax',
        'website',
        'memberSince',
        'bio',
        'socialMedia'
      ])

      // Remove any name, email, password fields from agentData if they exist
      delete agentData.name
      delete agentData.email
      delete agentData.password

      console.log('🔧 Creating agent with user data:', {
        ...userData,
        password: userData.password ? '***PRESENT***' : '***MISSING***'
      })

      // Check if user with this email already exists
      const existingUser = await User.findBy('email', userData.email)
      if (existingUser) {
        return response.badRequest({
          status: 'error',
          message: `Ya existe un usuario con el email ${userData.email}. Por favor use otro email.`,
          error: 'EMAIL_ALREADY_EXISTS'
        })
      }

      // Create User first
      const newUser = await User.create({
        ...userData,
        role: 'agent',
        status: 'active',
        emailVerifiedAt: DateTime.now()
      })

      console.log('✅ User created:', newUser.id)

      // Create Agent profile linked to User
      const agent = await Agent.create({
        ...agentData,
        userId: newUser.id,
        agencyId: agency.id,
        rating: 0,
        reviewsCount: 0,
        isActive: true
      })

      console.log('✅ Agent profile created:', agent.id)

      // Load relationships for response
      await agent.load('user')
      await agent.load('agency')

      return response.created({
        status: 'success',
        data: agent,
        message: 'Agent created successfully'
      })
    } catch (error) {
      console.error('❌ Error creating agent:', error)
      return response.badRequest({
        status: 'error',
        message: 'Error creating agent',
        error: error.message
      })
    }
  }

  /**
   * Upload logo for agency
   */
  async uploadLogo({ params, request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const agency = await Agency.find(params.id)

      if (!agency) {
        return response.notFound({
          status: 'error',
          message: 'Agency not found'
        })
      }

      // Check if user is admin of this agency
      if (agency.adminUserId !== user.id) {
        return response.forbidden({
          status: 'error',
          message: 'You are not authorized to update this agency'
        })
      }

      // Handle file upload
      const logoFile = request.file('logo', {
        size: '5mb',
        extnames: ['jpg', 'jpeg', 'png', 'webp']
      })

      if (!logoFile) {
        return response.badRequest({
          status: 'error',
          message: 'Please provide a logo file'
        })
      }

      if (!logoFile.isValid) {
        return response.badRequest({
          status: 'error',
          message: logoFile.errors?.[0]?.message || 'Invalid file'
        })
      }

      // Generate unique filename
      const fileName = `${cuid()}.${logoFile.extname}`
      
      // Move file to uploads directory
      await logoFile.move(app.makePath('public/uploads'), {
        name: fileName
      })

      // Create full URL
      const logoUrl = `${request.protocol()}://${request.header('host')}/uploads/${fileName}`

      // Update agency with new logo URL
      agency.logo = logoUrl
      await agency.save()

      await agency.load('admin')
      await agency.load('agents')

      return response.ok({
        status: 'success',
        data: agency,
        message: 'Logo uploaded successfully'
      })

    } catch (error) {
      return response.badRequest({
        status: 'error',
        message: 'Error uploading logo',
        error: error.message
      })
    }
  }

  /**
   * Sync ALL existing agents with user records (for token authentication)
   */
  async syncAgentsWithUsers({ response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()

      // Get ALL agents from ALL agencies (not just current user's agency)
      const agents = await Agent.query().preload('agency')

      let syncedCount = 0
      let alreadyExistsCount = 0
      let errorCount = 0

      console.log(`🔄 Starting sync for ${agents.length} agents...`)

      for (const agent of agents) {
        try {
          // Check if user record already exists
          const existingUser = await User.find(agent.id)
          if (existingUser) {
            alreadyExistsCount++
            console.log(`⏭️ User already exists for agent ${agent.name}`)
            continue
          }

          // Create user record for this agent
          await User.create({
            id: agent.id,
            firstName: agent.name,
            lastName: '',
            email: agent.email,
            password: agent.password, // Use the same hashed password
            role: 'agent',
            status: 'active',
            emailVerifiedAt: DateTime.now()
          })
          
          syncedCount++
          console.log(`✅ Synced agent ${agent.name} (${agent.agency?.name || 'No agency'}) with user record`)
        } catch (agentError) {
          errorCount++
          console.log(`❌ Failed to sync agent ${agent.name}:`, agentError.message)
        }
      }

      return response.ok({
        status: 'success',
        message: `Sincronización GLOBAL completada: ${syncedCount} agentes sincronizados, ${alreadyExistsCount} ya existían, ${errorCount} errores`,
        data: {
          synced: syncedCount,
          alreadyExists: alreadyExistsCount,
          errors: errorCount,
          total: agents.length
        }
      })

    } catch (error) {
      return response.internalServerError({
        status: 'error',
        message: 'Error syncing agents with users',
        error: error.message
      })
    }
  }

  /**
   * Get current agent's agency
   */
  async getAgentAgency({ response, auth }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      console.log('🔍 Getting agency for agent user:', user.id, user.role)

      // Only agents can access this endpoint
      if (user.role !== 'agent') {
        return response.forbidden({
          status: 'error',
          message: 'Only agents can access this endpoint'
        })
      }

      // Find the agent record for this user using the new user_id relationship
      const agent = await Agent.query()
        .where('user_id', user.id)
        .preload('agency')
        .first()

      console.log('🔍 Found agent record:', !!agent)
      console.log('🔍 Agent has agency:', !!agent?.agency)

      if (!agent) {
        console.log('❌ No agent record found for user:', user.id)
        return response.notFound({
          status: 'error',
          message: 'No agent profile found for this user. Please contact your agency administrator.'
        })
      }

      if (!agent.agency) {
        console.log('❌ Agent found but no agency assigned:', agent.id)
        return response.notFound({
          status: 'error',
          message: 'No agency assigned to this agent'
        })
      }

      console.log('✅ Returning agency:', agent.agency.name)
      return response.ok({
        status: 'success',
        data: agent.agency
      })
    } catch (error) {
      console.error('❌ Error retrieving agent agency:', error)
      return response.internalServerError({
        status: 'error',
        message: 'Error retrieving agent agency',
        error: error.message
      })
    }
  }
}
import type { HttpContext } from '@adonisjs/core/http'
import Agent from '#models/agent'
import Property from '#models/property'

export default class AgentsController {
  /**
   * Display a list of agents
   */
  async index({ request, response }: HttpContext) {
    try {
      const page = request.input('page', 1)
      const limit = request.input('limit', 10)
      const city = request.input('city')
      const category = request.input('category')
      const search = request.input('search')

      const query = Agent.query()
        .where('is_active', true)
        .withCount('properties', (propertiesQuery) => {
          propertiesQuery.where('property_status', 'published').where('listing_status', 'active')
        })

      // Apply filters
      if (city) {
        query.where('city', 'ILIKE', `%${city}%`)
      }

      if (category) {
        query.where('category', 'ILIKE', `%${category}%`)
      }

      if (search) {
        query.where((builder) => {
          builder
            .where('name', 'ILIKE', `%${search}%`)
            .orWhere('company', 'ILIKE', `%${search}%`)
            .orWhere('city', 'ILIKE', `%${search}%`)
        })
      }

      // Order by rating desc, then by name
      query.orderBy('rating', 'desc').orderBy('name', 'asc')

      const agents = await query.paginate(page, limit)
      
      // Transform the response to include propertiesCount and flatten the data
      const agentsData = agents.toJSON()
      agentsData.data = agentsData.data.map((agent: any) => ({
        ...agent.$attributes,
        propertiesCount: agent.$extras?.properties_count || 0
      }))

      return response.ok({
        success: true,
        data: agentsData,
        message: 'Agents retrieved successfully'
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to retrieve agents',
        error: error.message
      })
    }
  }

  /**
   * Show individual agent with their properties
   */
  async show({ params, request, response }: HttpContext) {
    try {
      const agent = await Agent.find(params.id)

      if (!agent) {
        return response.notFound({
          success: false,
          message: 'Agent not found'
        })
      }

      // Get agent's properties with pagination
      const page = request.input('page', 1)
      const limit = request.input('limit', 10)
      const propertyType = request.input('type') // 'sale' or 'rent'

      const propertiesQuery = Property.query()
        .where('agent_id', agent.id)
        .where('property_status', 'published')
        .where('listing_status', 'active')
        .preload('assets')

      if (propertyType) {
        propertiesQuery.where('listing_type', propertyType)
      }

      propertiesQuery.orderBy('created_at', 'desc')

      const properties = await propertiesQuery.paginate(page, limit)

      // Get properties count by type
      const totalCountResult = await Property.query()
        .where('agent_id', agent.id)
        .where('property_status', 'published')
        .where('listing_status', 'active')
        .count('* as total')
      
      const saleCountResult = await Property.query()
        .where('agent_id', agent.id)
        .where('property_status', 'published')
        .where('listing_status', 'active')
        .where('listing_type', 'sale')
        .count('* as total')
      
      const rentCountResult = await Property.query()
        .where('agent_id', agent.id)
        .where('property_status', 'published')
        .where('listing_status', 'active')
        .where('listing_type', 'rent')
        .count('* as total')

      const propertiesCount = {
        total: parseInt(totalCountResult[0].$extras.total) || 0,
        forSale: parseInt(saleCountResult[0].$extras.total) || 0,
        forRent: parseInt(rentCountResult[0].$extras.total) || 0
      }

      return response.ok({
        success: true,
        data: {
          agent: agent.toJSON(),
          properties: properties.toJSON(),
          propertiesCount
        },
        message: 'Agent details retrieved successfully'
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to retrieve agent details',
        error: error.message
      })
    }
  }

  /**
   * Create a new agent (Admin only)
   */
  async store({ request, response, auth }: HttpContext) {
    try {
      // Check if user is admin (you might want to add role-based middleware)
      const user = auth.user
      if (!user) {
        return response.unauthorized({
          success: false,
          message: 'Authentication required'
        })
      }

      const data = request.only([
        'name',
        'email',
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

      const agent = await Agent.create({
        ...data,
        rating: 0,
        reviewsCount: 0,
        isActive: true
      })

      return response.created({
        success: true,
        data: agent.toJSON(),
        message: 'Agent created successfully'
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to create agent',
        error: error.message
      })
    }
  }

  /**
   * Update agent information
   */
  async update({ params, request, response, auth }: HttpContext) {
    try {
      const user = auth.user
      if (!user) {
        return response.unauthorized({
          success: false,
          message: 'Authentication required'
        })
      }

      const agent = await Agent.find(params.id)

      if (!agent) {
        return response.notFound({
          success: false,
          message: 'Agent not found'
        })
      }

      const data = request.only([
        'name',
        'email',
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
        'socialMedia',
        'isActive'
      ])

      agent.merge(data)
      await agent.save()

      return response.ok({
        success: true,
        data: agent.toJSON(),
        message: 'Agent updated successfully'
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to update agent',
        error: error.message
      })
    }
  }

  /**
   * Delete agent
   */
  async destroy({ params, response, auth }: HttpContext) {
    try {
      const user = auth.user
      if (!user) {
        return response.unauthorized({
          success: false,
          message: 'Authentication required'
        })
      }

      const agent = await Agent.find(params.id)

      if (!agent) {
        return response.notFound({
          success: false,
          message: 'Agent not found'
        })
      }

      // Set agent_id to null for all properties assigned to this agent
      await Property.query()
        .where('agent_id', agent.id)
        .update({ agent_id: null })

      await agent.delete()

      return response.ok({
        success: true,
        message: 'Agent deleted successfully'
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to delete agent',
        error: error.message
      })
    }
  }
}
import type { HttpContext } from '@adonisjs/core/http'
import Property from '#models/property'
import vine from '@vinejs/vine'

export default class PropertiesController {
  // Get all properties with filters and pagination
  async index({ request, response }: HttpContext) {
    try {
      const page = request.input('page', 1)
      const limit = request.input('limit', 10)
      const category = request.input('category')
      const status = request.input('status')
      const minPrice = request.input('min_price')
      const maxPrice = request.input('max_price')
      const bedrooms = request.input('bedrooms')
      const bathrooms = request.input('bathrooms')
      const city = request.input('city')
      const featured = request.input('featured')

      let query = Property.query()
        .preload('user', (userQuery) => {
          userQuery.select(['id', 'firstName', 'lastName', 'email', 'phone', 'role'])
        })
        .orderBy('created_at', 'desc')

      // Apply filters
      if (category) {
        query = query.whereJsonSuperset('categories', [category])
      }

      if (status) {
        query = query.where('listing_status', status)
      }

      if (minPrice) {
        query = query.where('price', '>=', minPrice)
      }

      if (maxPrice) {
        query = query.where('price', '<=', maxPrice)
      }

      if (bedrooms) {
        query = query.where('bedrooms', bedrooms)
      }

      if (bathrooms) {
        query = query.where('bathrooms', bathrooms)
      }

      if (city) {
        query = query.where('city', 'ILIKE', `%${city}%`)
      }

      if (featured === 'true') {
        query = query.where('is_featured', true)
      }

      // Only show published and active properties for public
      query = query.where('property_status', 'published').where('listing_status', 'active')

      const properties = await query.paginate(page, limit)

      return response.ok({
        success: true,
        data: properties
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Error fetching properties',
        error: error.message
      })
    }
  }

  // Get single property by ID
  async show({ params, response }: HttpContext) {
    try {
      const property = await Property.query()
        .where('id', params.id)
        .preload('user', (userQuery) => {
          userQuery.select(['id', 'firstName', 'lastName', 'email', 'phone', 'role', 'companyName'])
        })
        .first()

      if (!property) {
        return response.notFound({
          success: false,
          message: 'Property not found'
        })
      }

      // Increment view count
      property.viewsCount += 1
      await property.save()

      return response.ok({
        success: true,
        data: property
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Error fetching property',
        error: error.message
      })
    }
  }

  // Create new property
  async store({ request, response, auth }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      const schema = vine.object({
        title: vine.string().minLength(3).maxLength(255),
        description: vine.string().optional(),
        categories: vine.array(vine.string()).optional(),
        listingStatus: vine.enum(['active', 'sold', 'processing']).optional(),
        propertyStatus: vine.enum(['pending', 'processing', 'published']).optional(),
        price: vine.number().min(0),
        yearlyTaxRate: vine.number().min(0).optional(),
        afterPriceLabel: vine.string().optional(),
        
        // Location
        address: vine.string().minLength(5),
        city: vine.string().optional(),
        state: vine.string().optional(),
        country: vine.string().optional(),
        zip: vine.string().optional(),
        neighborhood: vine.string().optional(),
        latitude: vine.number().optional(),
        longitude: vine.number().optional(),
        
        // Details
        sizeSqft: vine.number().min(0).optional(),
        lotSizeSqft: vine.number().min(0).optional(),
        rooms: vine.number().min(0).optional(),
        bedrooms: vine.number().min(0).optional(),
        bathrooms: vine.number().min(0).optional(),
        customId: vine.string().optional(),
        garages: vine.number().min(0).optional(),
        garageSize: vine.string().optional(),
        yearBuilt: vine.number().min(1800).max(new Date().getFullYear() + 5).optional(),
        availableFrom: vine.date().optional(),
        basement: vine.string().optional(),
        extraDetails: vine.string().optional(),
        roofing: vine.string().optional(),
        exteriorMaterial: vine.string().optional(),
        structureType: vine.string().optional(),
        ownerNotes: vine.string().optional(),
        
        // Amenities and media
        amenities: vine.array(vine.string()).optional(),
        images: vine.array(vine.string()).optional(),
        videos: vine.array(vine.string()).optional(),
        virtualTourUrl: vine.string().url().optional(),
        
        // Additional
        isFeatured: vine.boolean().optional(),
        mlsNumber: vine.string().optional()
      })

      const payload = await request.validateUsing(schema)

      const property = await Property.create({
        userId: user.id,
        ...payload
      })

      await property.load('user')

      return response.created({
        success: true,
        message: 'Property created successfully',
        data: property
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Error creating property',
        error: error.message
      })
    }
  }

  // Update property
  async update({ params, request, response, auth }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      const property = await Property.findOrFail(params.id)

      // Check if user owns the property or is admin
      if (property.userId !== user.id && user.role !== 'admin') {
        return response.forbidden({
          success: false,
          message: 'You are not authorized to update this property'
        })
      }

      const schema = vine.object({
        title: vine.string().minLength(3).maxLength(255).optional(),
        description: vine.string().optional(),
        categories: vine.array(vine.string()).optional(),
        listingStatus: vine.enum(['active', 'sold', 'processing']).optional(),
        propertyStatus: vine.enum(['pending', 'processing', 'published']).optional(),
        price: vine.number().min(0).optional(),
        yearlyTaxRate: vine.number().min(0).optional(),
        afterPriceLabel: vine.string().optional(),
        
        // Location
        address: vine.string().minLength(5).optional(),
        city: vine.string().optional(),
        state: vine.string().optional(),
        country: vine.string().optional(),
        zip: vine.string().optional(),
        neighborhood: vine.string().optional(),
        latitude: vine.number().optional(),
        longitude: vine.number().optional(),
        
        // Details
        sizeSqft: vine.number().min(0).optional(),
        lotSizeSqft: vine.number().min(0).optional(),
        rooms: vine.number().min(0).optional(),
        bedrooms: vine.number().min(0).optional(),
        bathrooms: vine.number().min(0).optional(),
        customId: vine.string().optional(),
        garages: vine.number().min(0).optional(),
        garageSize: vine.string().optional(),
        yearBuilt: vine.number().min(1800).max(new Date().getFullYear() + 5).optional(),
        availableFrom: vine.date().optional(),
        basement: vine.string().optional(),
        extraDetails: vine.string().optional(),
        roofing: vine.string().optional(),
        exteriorMaterial: vine.string().optional(),
        structureType: vine.string().optional(),
        ownerNotes: vine.string().optional(),
        
        // Amenities and media
        amenities: vine.array(vine.string()).optional(),
        images: vine.array(vine.string()).optional(),
        videos: vine.array(vine.string()).optional(),
        virtualTourUrl: vine.string().url().optional(),
        
        // Additional
        isFeatured: vine.boolean().optional(),
        mlsNumber: vine.string().optional()
      })

      const payload = await request.validateUsing(schema)

      property.merge(payload)
      await property.save()

      await property.load('user')

      return response.ok({
        success: true,
        message: 'Property updated successfully',
        data: property
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Error updating property',
        error: error.message
      })
    }
  }

  // Delete property
  async destroy({ params, response, auth }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      const property = await Property.findOrFail(params.id)

      // Check if user owns the property or is admin
      if (property.userId !== user.id && user.role !== 'admin') {
        return response.forbidden({
          success: false,
          message: 'You are not authorized to delete this property'
        })
      }

      await property.delete()

      return response.ok({
        success: true,
        message: 'Property deleted successfully'
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Error deleting property',
        error: error.message
      })
    }
  }

  // Get user's properties (dashboard)
  async myProperties({ response, auth, request }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const page = request.input('page', 1)
      const limit = request.input('limit', 10)

      const properties = await Property.query()
        .where('user_id', user.id)
        .orderBy('created_at', 'desc')
        .paginate(page, limit)

      return response.ok({
        success: true,
        data: properties
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Error fetching your properties',
        error: error.message
      })
    }
  }

  // Search properties
  async search({ request, response }: HttpContext) {
    try {
      const query = request.input('q', '')
      const page = request.input('page', 1)
      const limit = request.input('limit', 10)

      if (!query.trim()) {
        return response.badRequest({
          success: false,
          message: 'Search query is required'
        })
      }

      const properties = await Property.query()
        .where((queryBuilder) => {
          queryBuilder
            .where('title', 'ILIKE', `%${query}%`)
            .orWhere('description', 'ILIKE', `%${query}%`)
            .orWhere('address', 'ILIKE', `%${query}%`)
            .orWhere('city', 'ILIKE', `%${query}%`)
            .orWhere('neighborhood', 'ILIKE', `%${query}%`)
        })
        .where('property_status', 'published')
        .where('listing_status', 'active')
        .preload('user', (userQuery) => {
          userQuery.select(['id', 'firstName', 'lastName', 'email', 'phone', 'role'])
        })
        .orderBy('created_at', 'desc')
        .paginate(page, limit)

      return response.ok({
        success: true,
        data: properties
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Error searching properties',
        error: error.message
      })
    }
  }
}
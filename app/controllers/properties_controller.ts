import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Property from '#models/property'
import Asset from '#models/asset'
import vine from '@vinejs/vine'

export default class PropertiesController {
  // Get all properties with filters and pagination
  async index({ request, response }: HttpContext) {
    try {
      const page = request.input('page', 1)
      const limit = request.input('limit', 10)
      const category = request.input('category')
      const listingType = request.input('listing_type')
      const status = request.input('status')
      const minPrice = request.input('min_price')
      const maxPrice = request.input('max_price')
      const bedrooms = request.input('bedrooms')
      const bathrooms = request.input('bathrooms')
      const city = request.input('city')
      const featured = request.input('featured')
      const agentId = request.input('agent_id')

      let query = Property.query()
        .preload('user', (userQuery) => {
          userQuery.select(['id', 'firstName', 'lastName', 'email', 'phone', 'role'])
        })
        .preload('agent', (agentQuery) => {
          agentQuery.select(['id', 'name', 'email', 'phone1', 'phone2', 'company', 'image'])
        })
        .preload('assets', (assetQuery) => {
          assetQuery.orderBy('sort_order', 'asc').orderBy('created_at', 'asc')
        })
        .orderBy('created_at', 'desc')

      // Apply filters
      if (category) {
        query = query.whereJsonSuperset('categories', [category])
      }

      if (listingType) {
        query = query.where('listing_type', listingType)
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

      if (agentId) {
        query = query.where('agent_id', agentId)
      }

      // Only show published and active properties for public
      query = query.where('property_status', 'published').where('listing_status', 'active')

      const properties = await query.paginate(page, limit)

      return response.ok({
        success: true,
        data: properties,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Error fetching properties',
        error: error.message,
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
        .preload('agent', (agentQuery) => {
          agentQuery.select(['id', 'name', 'email', 'phone1', 'phone2', 'company', 'image'])
        })
        .preload('assets', (assetQuery) => {
          assetQuery.orderBy('sort_order', 'asc').orderBy('created_at', 'asc')
        })
        .first()

      if (!property) {
        return response.notFound({
          success: false,
          message: 'Property not found',
        })
      }

      // Increment view count
      property.viewsCount += 1
      await property.save()

      console.log('=== SHOW PROPERTY DEBUG ===')
      console.log('Property ID:', property.id)
      console.log('Assets count:', property.assets?.length || 0)
      if (property.assets && property.assets.length > 0) {
        console.log(
          'Assets:',
          property.assets.map((asset) => ({
            id: asset.id,
            type: asset.type,
            fileUrl: asset.fileUrl,
            sortOrder: asset.sortOrder,
          }))
        )
      }
      console.log('===========================')

      return response.ok({
        success: true,
        data: property,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Error fetching property',
        error: error.message,
      })
    }
  }

  // Test endpoint for debugging
  async test({ request, response, auth }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      console.log('User:', user)
      console.log('Request body:', request.body())
      console.log('Request all:', request.all())

      // Simple validation
      const simpleValidator = vine.compile(
        vine.object({
          title: vine.string(),
          address: vine.string(),
          price: vine.number(),
        })
      )

      const payload = await request.validateUsing(simpleValidator)
      console.log('Simple validation passed:', payload)

      return response.ok({
        success: true,
        message: 'Test successful',
        data: { user: user.id, payload },
      })
    } catch (error) {
      console.error('Test error:', error)
      return response.badRequest({
        success: false,
        message: 'Test failed',
        error: error.message,
        details: error.messages || null,
      })
    }
  }

  // Save property as draft (less strict validation)
  async saveDraft({ request, response, auth }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      // Very minimal validation for drafts - only require basic fields
      const draftValidator = vine.compile(
        vine.object({
          id: vine.string().optional().nullable(), // Allow ID for updating existing drafts
          title: vine.string().optional().nullable(),
          description: vine.string().optional().nullable(),
          address: vine.string().optional().nullable(),
          city: vine.string().optional().nullable(),
          price: vine.number().min(0).max(999999999).optional().nullable(), // Max $999M
          
          // All other fields are completely optional
          categories: vine.array(vine.string()).optional().nullable(),
          listingType: vine.enum(['sale', 'rent', 'R2O']).optional().nullable(),
          listingStatus: vine.enum(['active', 'sold', 'processing']).optional().nullable(),
          propertyStatus: vine.string().optional().nullable(), // Draft will override this
          
          // Allow any other fields
          state: vine.string().optional().nullable(),
          country: vine.string().optional().nullable(),
          zip: vine.string().optional().nullable(),
          neighborhood: vine.string().optional().nullable(),
          latitude: vine.number().min(-90).max(90).optional().nullable(),
          longitude: vine.number().min(-180).max(180).optional().nullable(),
          sizeSqft: vine.number().min(0).max(50000).optional().nullable(),
          lotSizeSqft: vine.number().min(0).max(100000).optional().nullable(),
          rooms: vine.number().min(0).max(50).optional().nullable(),
          bedrooms: vine.number().min(0).max(20).optional().nullable(),
          bathrooms: vine.number().min(0).max(20).optional().nullable(),
          customId: vine.string().optional().nullable(),
          garages: vine.number().min(0).max(10).optional().nullable(),
          garageSize: vine.string().optional().nullable(),
          yearBuilt: vine.number().min(1800).max(new Date().getFullYear() + 5).optional().nullable(),
          availableFrom: vine.string().optional().nullable(),
          basement: vine.string().optional().nullable(),
          extraDetails: vine.string().optional().nullable(),
          roofing: vine.string().optional().nullable(),
          exteriorMaterial: vine.string().optional().nullable(),
          structureType: vine.string().optional().nullable(),
          ownerNotes: vine.string().optional().nullable(),
          amenities: vine.array(vine.string()).optional().nullable(),
          images: vine.array(vine.any()).optional().nullable(),
          videos: vine.array(vine.string()).optional().nullable(),
          virtualTourUrl: vine.string().optional().nullable(),
          isFeatured: vine.boolean().optional().nullable(),
          mlsNumber: vine.string().optional().nullable(),
          yearlyTaxRate: vine.number().min(0).max(999999).optional().nullable(),
          afterPriceLabel: vine.string().optional().nullable(),
        })
      )

      const payload = await request.validateUsing(draftValidator)
      
      // Extract images and videos from payload  
      const { images, videos, id, ...propertyData } = payload

      // Convert availableFrom if provided
      if (propertyData.availableFrom) {
        try {
          propertyData.availableFrom = DateTime.fromISO(propertyData.availableFrom)
        } catch (error) {
          try {
            propertyData.availableFrom = DateTime.fromFormat(propertyData.availableFrom, 'yyyy-MM-dd')
          } catch (formatError) {
            console.log('Invalid date format, saving as null:', propertyData.availableFrom)
            propertyData.availableFrom = null
          }
        }
      }

      // Force draft status
      propertyData.propertyStatus = 'draft'
      propertyData.listingStatus = propertyData.listingStatus || 'active'

      let property;

      // Check if updating existing draft or creating new one
      if (id) {
        // Try to find existing property
        property = await Property.query()
          .where('id', id)
          .where('user_id', user.id)
          .first()

        if (property) {
          // Update existing property (only if it's a draft or belongs to user)
          if (property.propertyStatus === 'draft' || property.userId === user.id) {
            await property.merge(propertyData).save()
            console.log('Updated existing draft:', property.id)
          } else {
            // If property exists but is not a draft, create new draft
            delete propertyData.id // Remove ID to create new
            property = await Property.create({
              userId: user.id,
              ...propertyData,
            })
            console.log('Created new draft from published property:', property.id)
          }
        } else {
          // Property not found or doesn't belong to user, create new
          property = await Property.create({
            userId: user.id,
            ...propertyData,
          })
          console.log('Created new draft (property not found):', property.id)
        }
      } else {
        // Create new draft property
        property = await Property.create({
          userId: user.id,
          ...propertyData,
        })
        console.log('Created new draft:', property.id)
      }

      // Handle images and videos if provided (same logic as main store)
      if (images && images.length > 0) {
        let validImageIndex = 0
        for (let i = 0; i < images.length; i++) {
          const image = images[i]
          
          let imageUrl: string
          let floorLabel: string = 'ground-floor'
          
          if (typeof image === 'string') {
            imageUrl = image
          } else if (image && typeof image === 'object' && 'url' in image) {
            imageUrl = image.url
            floorLabel = image.floorLabel || 'ground-floor'
          } else {
            continue
          }

          if (imageUrl.startsWith('blob:')) {
            continue
          }

          await Asset.create({
            propertyId: property.id,
            type: 'image',
            fileName: `draft_image_${validImageIndex + 1}`,
            filePath: imageUrl,
            fileUrl: imageUrl,
            sortOrder: validImageIndex,
            isFeatured: validImageIndex === 0,
            metadata: {
              floorLabel: floorLabel
            }
          })
          validImageIndex++
        }
      }

      await property.load('assets')

      return response.created({
        success: true,
        message: 'Draft saved successfully',
        data: property,
      })
    } catch (error) {
      console.error('Error saving draft:', error)
      return response.badRequest({
        success: false,
        message: 'Error saving draft',
        error: error.message,
      })
    }
  }

  // Get user's draft properties
  async getDrafts({ response, auth }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      const drafts = await Property.query()
        .where('user_id', user.id)
        .where('property_status', 'draft')
        .preload('assets', (assetQuery) => {
          assetQuery.orderBy('sort_order', 'asc').orderBy('created_at', 'asc')
        })
        .orderBy('updated_at', 'desc')

      return response.ok({
        success: true,
        data: drafts,
      })
    } catch (error) {
      console.error('Error fetching drafts:', error)
      return response.badRequest({
        success: false,
        message: 'Error fetching drafts',
        error: error.message,
      })
    }
  }

  // Create new property
  async store({ request, response, auth }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      // Debug: Log the incoming request data
      console.log('Request body:', request.body())
      console.log('Request all:', request.all())

      // Temporarily simplify validation to identify the issue
      const createPropertyValidator = vine.compile(
        vine.object({
          title: vine.string().minLength(3).maxLength(255),
          address: vine.string().minLength(5),
          price: vine.number().min(0).max(999999999), // Max $999M

          // Optional fields - make them more lenient
          description: vine.string().optional().nullable(),
          categories: vine.array(vine.string()).optional().nullable(),
          listingType: vine.enum(['sale', 'rent', 'R2O']).optional().nullable(),
          listingStatus: vine.enum(['active', 'sold', 'processing']).optional().nullable(),
          propertyStatus: vine.enum(['pending', 'processing', 'published']).optional().nullable(),
          yearlyTaxRate: vine.number().min(0).max(999999).optional(), // Max $999K tax rate
          afterPriceLabel: vine.string().optional().nullable(),

          // Location
          city: vine.string().optional().nullable(),
          state: vine.string().optional().nullable(),
          country: vine.string().optional().nullable(),
          zip: vine.string().optional().nullable(),
          neighborhood: vine.string().optional().nullable(),
          latitude: vine.number().min(-90).max(90).optional().nullable(), // Valid latitude range
          longitude: vine.number().min(-180).max(180).optional().nullable(), // Valid longitude range

          // Details - add reasonable maximum limits
          sizeSqft: vine.number().min(0).max(50000).optional(),
          lotSizeSqft: vine.number().min(0).max(100000).optional(),
          rooms: vine.number().min(0).max(50).optional(),
          bedrooms: vine.number().min(0).max(20).optional(),
          bathrooms: vine.number().min(0).max(20).optional(),
          customId: vine.string().optional().nullable(),
          garages: vine.number().min(0).max(10).optional(),
          garageSize: vine.string().optional().nullable(),
          yearBuilt: vine
            .number()
            .min(1800)
            .max(new Date().getFullYear() + 5)
            .optional(),
          availableFrom: vine.string().optional().nullable(),
          basement: vine.string().optional().nullable(),
          extraDetails: vine.string().optional().nullable(),
          roofing: vine.string().optional().nullable(),
          exteriorMaterial: vine.string().optional().nullable(),
          structureType: vine.string().optional().nullable(),
          ownerNotes: vine.string().optional().nullable(),

          // Amenities and media
          amenities: vine.array(vine.string()).optional().nullable(),
          images: vine.array(vine.any()).optional().nullable(),
          videos: vine.array(vine.string()).optional().nullable(), // Keep for temporary compatibility
          virtualTourUrl: vine.string().optional().nullable(),

          // Additional
          isFeatured: vine.boolean().optional().nullable(),
          mlsNumber: vine.string().optional().nullable(),
        })
      )

      console.log('About to validate with schema...')
      const payload = await request.validateUsing(createPropertyValidator)
      console.log('Validation successful, payload:', payload)

      // Extract images and videos from payload
      const { images, videos, ...propertyData } = payload

      // Convert availableFrom string to DateTime if provided
      if (propertyData.availableFrom) {
        try {
          propertyData.availableFrom = DateTime.fromISO(propertyData.availableFrom)
        } catch (error) {
          // If ISO parsing fails, try other formats
          try {
            propertyData.availableFrom = DateTime.fromFormat(propertyData.availableFrom, 'yyyy-MM-dd')
          } catch (formatError) {
            console.error('Could not parse availableFrom date:', propertyData.availableFrom)
            delete propertyData.availableFrom // Remove invalid date
          }
        }
      }

      // Debug: Log final data before creating property
      console.log('=== CREATING PROPERTY WITH DATA ===')
      console.log('Final propertyData:', JSON.stringify(propertyData, null, 2))
      console.log('=================================')

      // Create the property first (without JSON image/video fields)
      const property = await Property.create({
        userId: user.id,
        ...propertyData,
      })

      // Create asset records for images and videos (skip blob URLs)
      if (images && images.length > 0) {
        let validImageIndex = 0
        for (let i = 0; i < images.length; i++) {
          const image = images[i]
          
          // Handle both legacy string format and new object format
          let imageUrl: string
          let floorLabel: string = 'ground-floor'
          
          if (typeof image === 'string') {
            imageUrl = image
          } else if (image && typeof image === 'object' && 'url' in image) {
            imageUrl = image.url
            floorLabel = image.floorLabel || 'ground-floor'
          } else {
            console.log(`Invalid image format: ${JSON.stringify(image)}`)
            continue
          }

          // Skip blob URLs - they don't work
          if (imageUrl.startsWith('blob:')) {
            console.log(`Skipping blob URL: ${imageUrl}`)
            continue
          }

          await Asset.create({
            propertyId: property.id,
            type: 'image',
            fileName: `temp_image_${validImageIndex + 1}`, // Temporary filename
            filePath: imageUrl,
            fileUrl: imageUrl, // Store as URL for now
            sortOrder: validImageIndex,
            isFeatured: validImageIndex === 0, // First valid image is featured
            metadata: {
              floorLabel: floorLabel
            }
          })
          validImageIndex++
        }
      }

      if (videos && videos.length > 0) {
        let validVideoIndex = 0
        for (let i = 0; i < videos.length; i++) {
          const videoUrl = videos[i]

          // Skip blob URLs - they don't work
          if (typeof videoUrl === 'string' && videoUrl.startsWith('blob:')) {
            console.log(`Skipping blob video URL: ${videoUrl}`)
            continue
          }

          await Asset.create({
            propertyId: property.id,
            type: 'video',
            fileName: `temp_video_${validVideoIndex + 1}`, // Temporary filename
            filePath: videoUrl,
            fileUrl: videoUrl, // Store as URL for now
            sortOrder: validVideoIndex,
          })
          validVideoIndex++
        }
      }

      // Load relationships for response
      await property.load('user')
      await property.load('assets')

      return response.created({
        success: true,
        message: 'Property created successfully',
        data: property,
      })
    } catch (error) {
      console.error('Error in store method:', error)
      console.error('Error details:', error.messages || error.message)
      return response.badRequest({
        success: false,
        message: 'Error creating property',
        error: error.message,
        details: error.messages || null,
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
          message: 'You are not authorized to update this property',
        })
      }

      const updatePropertyValidator = vine.compile(
        vine.object({
          title: vine.string().minLength(3).maxLength(255).optional(),
          description: vine.string().optional(),
          categories: vine.array(vine.string()).optional(),
          listingType: vine.enum(['sale', 'rent', 'R2O']).optional(),
          listingStatus: vine.enum(['active', 'sold', 'processing']).optional(),
          propertyStatus: vine.enum(['pending', 'processing', 'published']).optional(),
          price: vine.number().min(0).max(999999999).optional(), // Max $999M
          yearlyTaxRate: vine.number().min(0).max(999999).optional(), // Max $999K tax rate
          afterPriceLabel: vine.string().optional(),

          // Location
          address: vine.string().minLength(5).optional(),
          city: vine.string().optional(),
          state: vine.string().optional(),
          country: vine.string().optional(),
          zip: vine.string().optional(),
          neighborhood: vine.string().optional(),
          latitude: vine.number().min(-90).max(90).optional(),
          longitude: vine.number().min(-180).max(180).optional(),

          // Details
          sizeSqft: vine.number().min(0).max(50000).optional(),
          lotSizeSqft: vine.number().min(0).max(100000).optional(),
          rooms: vine.number().min(0).max(50).optional(),
          bedrooms: vine.number().min(0).max(20).optional(),
          bathrooms: vine.number().min(0).max(20).optional(),
          customId: vine.string().optional(),
          garages: vine.number().min(0).max(10).optional(),
          garageSize: vine.string().optional(),
          yearBuilt: vine
            .number()
            .min(1800)
            .max(new Date().getFullYear() + 5)
            .optional(),
          availableFrom: vine.string().optional().nullable(),
          basement: vine.string().optional(),
          extraDetails: vine.string().optional(),
          roofing: vine.string().optional(),
          exteriorMaterial: vine.string().optional(),
          structureType: vine.string().optional(),
          ownerNotes: vine.string().optional(),

          // Amenities and media
          amenities: vine.array(vine.string()).optional(),
          images: vine.array(vine.any()).optional().nullable(),
          videos: vine.array(vine.string()).optional().nullable(),
          virtualTourUrl: vine.string().optional().nullable(),

          // Additional
          isFeatured: vine.boolean().optional(),
          mlsNumber: vine.string().optional(),
        })
      )

      const payload = await request.validateUsing(updatePropertyValidator)

      // DEBUG: Log what we're receiving
      console.log('=== UPDATE PROPERTY DEBUG ===')
      console.log('Raw request body:', request.body())
      console.log('Validated payload:', payload)
      console.log('Categories type:', typeof payload.categories, payload.categories)
      console.log('Amenities type:', typeof payload.amenities, payload.amenities)
      console.log('Images in payload:', 'images' in payload, typeof payload.images, payload.images)
      console.log('Videos in payload:', 'videos' in payload, typeof payload.videos, payload.videos)
      console.log('============================')

      // Extract images and videos from payload
      const { images, videos, ...propertyData } = payload

      // Convert availableFrom string to DateTime if provided
      if (propertyData.availableFrom) {
        try {
          propertyData.availableFrom = DateTime.fromISO(propertyData.availableFrom)
        } catch (error) {
          // If ISO parsing fails, try other formats
          try {
            propertyData.availableFrom = DateTime.fromFormat(propertyData.availableFrom, 'yyyy-MM-dd')
          } catch (formatError) {
            console.error('Could not parse availableFrom date:', propertyData.availableFrom)
            delete propertyData.availableFrom // Remove invalid date
          }
        }
      }

      // Update property data
      property.merge(propertyData)
      await property.save()

      // Handle asset updates ONLY if images are explicitly provided (not null or undefined)
      if (images !== undefined && images !== null) {
        console.log('=== UPDATING IMAGES ===')
        console.log('Images received:', images)
        console.log('Number of images:', images ? images.length : 0)

        // Delete existing image assets
        const deletedImages = await Asset.query()
          .where('property_id', property.id)
          .where('type', 'image')
          .delete()
        console.log('Deleted existing images:', deletedImages)

        // Create new image assets (skip blob URLs)
        if (images && images.length > 0) {
          let validImageIndex = 0
          for (let i = 0; i < images.length; i++) {
            const image = images[i]
            
            // Handle both legacy string format and new object format
            let imageUrl: string
            let floorLabel: string = 'ground-floor'
            
            if (typeof image === 'string') {
              imageUrl = image
            } else if (image && typeof image === 'object' && 'url' in image) {
              imageUrl = image.url
              floorLabel = image.floorLabel || 'ground-floor'
            } else {
              console.log(`Invalid image format: ${JSON.stringify(image)}`)
              continue
            }

            // Skip blob URLs - they don't work
            if (imageUrl.startsWith('blob:')) {
              console.log(`Skipping blob URL: ${imageUrl}`)
              continue
            }

            console.log(`Creating image asset with URL: ${imageUrl}, floor: ${floorLabel}`)
            const newAsset = await Asset.create({
              propertyId: property.id,
              type: 'image',
              fileName: `temp_image_${validImageIndex + 1}`, // Temporary filename
              filePath: imageUrl,
              fileUrl: imageUrl, // Store as URL for now
              sortOrder: validImageIndex,
              isFeatured: validImageIndex === 0, // First valid image is featured
              metadata: {
                floorLabel: floorLabel
              }
            })
            console.log(`Created image asset ${validImageIndex + 1}:`, newAsset.toJSON())
            validImageIndex++
          }
        }
        console.log('=== END UPDATING IMAGES ===')
      } else {
        console.log('Images field not provided, keeping existing images')
      }

      // Handle video asset updates ONLY if videos are explicitly provided (not null or undefined)
      if (videos !== undefined && videos !== null) {
        console.log('=== UPDATING VIDEOS ===')
        console.log('Videos received:', videos)
        console.log('Number of videos:', videos ? videos.length : 0)

        // Delete existing video assets
        const deletedVideos = await Asset.query()
          .where('property_id', property.id)
          .where('type', 'video')
          .delete()
        console.log('Deleted existing videos:', deletedVideos)

        // Create new video assets (skip blob URLs)
        if (videos && videos.length > 0) {
          let validVideoIndex = 0
          for (let i = 0; i < videos.length; i++) {
            const videoUrl = videos[i]

            // Skip blob URLs - they don't work
            if (typeof videoUrl === 'string' && videoUrl.startsWith('blob:')) {
              console.log(`Skipping blob video URL: ${videoUrl}`)
              continue
            }

            await Asset.create({
              propertyId: property.id,
              type: 'video',
              fileName: `temp_video_${validVideoIndex + 1}`, // Temporary filename
              filePath: videoUrl,
              fileUrl: videoUrl, // Store as URL for now
              sortOrder: validVideoIndex,
            })
            validVideoIndex++
          }
        }
        console.log('=== END UPDATING VIDEOS ===')
      } else {
        console.log('Videos field not provided, keeping existing videos')
      }

      // Load relationships for response
      await property.load('user')
      await property.load('assets')

      console.log('=== FINAL PROPERTY DATA ===')
      console.log('Property with assets:', property.toJSON())
      console.log('Assets count:', property.assets?.length || 0)
      console.log('============================')

      return response.ok({
        success: true,
        message: 'Property updated successfully',
        data: property,
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Error updating property',
        error: error.message,
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
          message: 'You are not authorized to delete this property',
        })
      }

      await property.delete()

      return response.ok({
        success: true,
        message: 'Property deleted successfully',
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Error deleting property',
        error: error.message,
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
        .preload('agent', (agentQuery) => {
          agentQuery.select(['id', 'name', 'email', 'phone1', 'phone2', 'company', 'image'])
        })
        .preload('assets', (assetQuery) => {
          assetQuery.orderBy('sort_order', 'asc').orderBy('created_at', 'asc')
        })
        .orderBy('created_at', 'desc')
        .paginate(page, limit)

      console.log('=== MY PROPERTIES DEBUG ===')
      console.log('Properties count:', properties.length)
      properties.forEach((property, index) => {
        console.log(`Property ${index + 1}: ${property.title}`)
        console.log(`  Assets count: ${property.assets?.length || 0}`)
        if (property.assets && property.assets.length > 0) {
          property.assets.forEach((asset, assetIndex) => {
            console.log(`    Asset ${assetIndex + 1}: ${asset.type} - ${asset.fileUrl}`)
          })
        }
      })
      console.log('==============================')

      return response.ok({
        success: true,
        data: properties,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Error fetching your properties',
        error: error.message,
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
          message: 'Search query is required',
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
        .preload('agent', (agentQuery) => {
          agentQuery.select(['id', 'name', 'email', 'phone1', 'phone2', 'company', 'image'])
        })
        .preload('assets', (assetQuery) => {
          assetQuery.orderBy('sort_order', 'asc').orderBy('created_at', 'asc')
        })
        .orderBy('created_at', 'desc')
        .paginate(page, limit)

      return response.ok({
        success: true,
        data: properties,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Error searching properties',
        error: error.message,
      })
    }
  }

  // Assign agent to property
  async assignAgent({ params, request, response, auth }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const { agentId } = request.only(['agentId'])

      const property = await Property.findOrFail(params.id)

      // Check if user owns the property or is admin
      if (property.userId !== user.id && user.role !== 'admin') {
        return response.forbidden({
          success: false,
          message: 'You are not authorized to modify this property',
        })
      }

      // Validate agent exists if agentId is provided
      if (agentId) {
        const Agent = (await import('#models/agent')).default
        const agent = await Agent.find(agentId)
        if (!agent) {
          return response.badRequest({
            success: false,
            message: 'Agent not found',
          })
        }
      }

      // Update property with agent
      property.agentId = agentId || null
      await property.save()

      // Load relationships for response
      await property.load('agent')
      await property.load('user')

      return response.ok({
        success: true,
        message: agentId ? 'Agent assigned successfully' : 'Agent unassigned successfully',
        data: property,
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Error assigning agent to property',
        error: error.message,
      })
    }
  }

  // Get similar properties based on location, type, and price range
  async similar({ params, request, response }: HttpContext) {
    try {
      const { limit = 8 } = request.qs()
      const propertyId = params.id

      // Get the reference property
      const referenceProperty = await Property.findOrFail(propertyId)

      // Define similarity criteria
      const priceRange = 0.3 // 30% price tolerance
      const minPrice = referenceProperty.price * (1 - priceRange)
      const maxPrice = referenceProperty.price * (1 + priceRange)

      // Build query for similar properties
      let query = Property.query()
        .where('id', '!=', propertyId) // Exclude the reference property
        .where('property_status', 'published')
        .where('listing_status', 'active')
        .preload('assets', (assetQuery) => {
          assetQuery
            .where('type', 'image')
            .orderBy('sort_order', 'asc')
            .orderBy('created_at', 'asc')
        })
        .preload('agent', (agentQuery) => {
          agentQuery.select(['id', 'name', 'email', 'phone1', 'image'])
        })
        .preload('user', (userQuery) => {
          userQuery.select(['id', 'firstName', 'lastName', 'email'])
        })

      // Apply similarity filters with priority scoring
      // Priority 1: Same listing type and similar price
      if (referenceProperty.listingType) {
        query = query.where('listing_type', referenceProperty.listingType)
      }

      // Priority 2: Price range
      query = query.whereBetween('price', [minPrice, maxPrice])

      // Priority 3: Same city (if available)
      if (referenceProperty.city) {
        query = query.where('city', 'ILIKE', referenceProperty.city)
      }

      // Priority 4: Similar number of bedrooms/bathrooms (±1)
      if (referenceProperty.bedrooms) {
        query = query.whereBetween('bedrooms', [
          Math.max(1, referenceProperty.bedrooms - 1),
          referenceProperty.bedrooms + 1
        ])
      }

      // Get initial results
      let similarProperties = await query.limit(parseInt(limit)).exec()

      // If not enough results, expand search criteria
      if (similarProperties.length < parseInt(limit)) {
        const remainingLimit = parseInt(limit) - similarProperties.length
        const excludeIds = similarProperties.map(p => p.id).concat(propertyId)

        // Broader search: same state or similar categories
        let broaderQuery = Property.query()
          .whereNotIn('id', excludeIds)
          .where('property_status', 'published')
          .where('listing_status', 'active')
          .preload('assets', (assetQuery) => {
            assetQuery
              .where('type', 'image')
              .orderBy('sort_order', 'asc')
              .orderBy('created_at', 'asc')
          })
          .preload('agent', (agentQuery) => {
            agentQuery.select(['id', 'name', 'email', 'phone1', 'image'])
          })
          .preload('user', (userQuery) => {
            userQuery.select(['id', 'firstName', 'lastName', 'email'])
          })

        // Same listing type but broader price range
        if (referenceProperty.listingType) {
          broaderQuery = broaderQuery.where('listing_type', referenceProperty.listingType)
        }

        // Same state
        if (referenceProperty.state) {
          broaderQuery = broaderQuery.where('state', 'ILIKE', referenceProperty.state)
        }

        const broaderResults = await broaderQuery.limit(remainingLimit).exec()
        similarProperties = [...similarProperties, ...broaderResults]
      }

      // If still not enough, get random properties of same type
      if (similarProperties.length < parseInt(limit)) {
        const remainingLimit = parseInt(limit) - similarProperties.length
        const excludeIds = similarProperties.map(p => p.id).concat(propertyId)

        const randomQuery = Property.query()
          .whereNotIn('id', excludeIds)
          .where('property_status', 'published')
          .where('listing_status', 'active')
          .preload('assets', (assetQuery) => {
            assetQuery
              .where('type', 'image')
              .orderBy('sort_order', 'asc')
              .orderBy('created_at', 'asc')
          })
          .preload('agent', (agentQuery) => {
            agentQuery.select(['id', 'name', 'email', 'phone1', 'image'])
          })
          .preload('user', (userQuery) => {
            userQuery.select(['id', 'firstName', 'lastName', 'email'])
          })

        if (referenceProperty.listingType) {
          randomQuery.where('listing_type', referenceProperty.listingType)
        }

        const randomResults = await randomQuery
          .orderByRaw('RANDOM()')
          .limit(remainingLimit)
          .exec()

        similarProperties = [...similarProperties, ...randomResults]
      }

      return response.ok({
        success: true,
        data: similarProperties.slice(0, parseInt(limit)), // Ensure we don't exceed limit
        reference: {
          id: referenceProperty.id,
          title: referenceProperty.title,
          price: referenceProperty.price,
          city: referenceProperty.city,
          state: referenceProperty.state,
          listingType: referenceProperty.listingType,
        },
      })
    } catch (error) {
      console.error('Error fetching similar properties:', error)
      return response.internalServerError({
        success: false,
        message: 'Error fetching similar properties',
        error: error.message,
      })
    }
  }
}

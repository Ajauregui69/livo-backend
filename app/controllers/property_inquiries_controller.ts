import type { HttpContext } from '@adonisjs/core/http'
import PropertyInquiry from '#models/property_inquiry'
import Property from '#models/property'
import vine from '@vinejs/vine'

export default class PropertyInquiriesController {
  // Create new property inquiry
  async store({ params, request, response }: HttpContext) {
    try {
      const createInquiryValidator = vine.compile(
        vine.object({
          name: vine.string().minLength(2).maxLength(100),
          phone: vine.string().minLength(10).maxLength(20).optional().nullable(),
          email: vine.string().email(),
          inquiryType: vine.string().in(['Engineer', 'Doctor', 'Employee', 'Businessman', 'Other']).optional(),
          message: vine.string().minLength(10).maxLength(1000),
          agreeToTerms: vine.boolean(),
        })
      )

      const payload = await request.validateUsing(createInquiryValidator)
      
      // Get propertyId from URL params
      const propertyId = params.propertyId

      // Validate that user agreed to terms
      if (!payload.agreeToTerms) {
        return response.badRequest({
          success: false,
          message: 'You must agree to the terms to submit an inquiry',
        })
      }

      // Verify property exists
      const property = await Property.find(propertyId)
      if (!property) {
        return response.notFound({
          success: false,
          message: 'Property not found',
        })
      }

      // Create inquiry
      const inquiry = await PropertyInquiry.create({
        ...payload,
        propertyId,
        status: 'pending',
      })

      // Load property relationship for response
      await inquiry.load('property')

      return response.created({
        success: true,
        message: 'Inquiry submitted successfully',
        data: inquiry,
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Error submitting inquiry',
        error: error.message,
        details: error.messages || null,
      })
    }
  }

  // Get all inquiries for a property (property owner only)
  async index({ params, response, auth }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const propertyId = params.propertyId

      // Verify property exists and user owns it
      const property = await Property.query()
        .where('id', propertyId)
        .where('user_id', user.id)
        .first()

      if (!property) {
        return response.notFound({
          success: false,
          message: 'Property not found or you do not have access',
        })
      }

      const inquiries = await PropertyInquiry.query()
        .where('property_id', propertyId)
        .preload('property', (propertyQuery) => {
          propertyQuery.select(['id', 'title', 'address'])
        })
        .orderBy('created_at', 'desc')

      return response.ok({
        success: true,
        data: inquiries,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Error fetching inquiries',
        error: error.message,
      })
    }
  }

  // Get all inquiries for authenticated user's properties
  async myInquiries({ response, auth, request }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const page = request.input('page', 1)
      const limit = request.input('limit', 10)
      const status = request.input('status')

      let query = PropertyInquiry.query()
        .preload('property', (propertyQuery) => {
          propertyQuery
            .select(['id', 'title', 'address', 'user_id'])
            .where('user_id', user.id)
        })
        .whereHas('property', (propertyQuery) => {
          propertyQuery.where('user_id', user.id)
        })
        .orderBy('created_at', 'desc')

      if (status) {
        query = query.where('status', status)
      }

      const inquiries = await query.paginate(page, limit)

      return response.ok({
        success: true,
        data: inquiries,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Error fetching your inquiries',
        error: error.message,
      })
    }
  }

  // Update inquiry status (property owner only)
  async updateStatus({ params, request, response, auth }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const inquiryId = params.id

      const updateStatusValidator = vine.compile(
        vine.object({
          status: vine.string().in(['pending', 'contacted', 'closed']),
        })
      )

      const payload = await request.validateUsing(updateStatusValidator)

      // Find inquiry and verify property ownership
      const inquiry = await PropertyInquiry.query()
        .where('id', inquiryId)
        .preload('property')
        .first()

      if (!inquiry) {
        return response.notFound({
          success: false,
          message: 'Inquiry not found',
        })
      }

      if (inquiry.property.userId !== user.id) {
        return response.forbidden({
          success: false,
          message: 'You are not authorized to update this inquiry',
        })
      }

      inquiry.status = payload.status
      await inquiry.save()

      return response.ok({
        success: true,
        message: 'Inquiry status updated successfully',
        data: inquiry,
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Error updating inquiry status',
        error: error.message,
        details: error.messages || null,
      })
    }
  }

  // Get single inquiry (property owner only)
  async show({ params, response, auth }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const inquiryId = params.id

      const inquiry = await PropertyInquiry.query()
        .where('id', inquiryId)
        .preload('property', (propertyQuery) => {
          propertyQuery.select(['id', 'title', 'address', 'user_id'])
        })
        .first()

      if (!inquiry) {
        return response.notFound({
          success: false,
          message: 'Inquiry not found',
        })
      }

      if (inquiry.property.userId !== user.id) {
        return response.forbidden({
          success: false,
          message: 'You are not authorized to view this inquiry',
        })
      }

      return response.ok({
        success: true,
        data: inquiry,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Error fetching inquiry',
        error: error.message,
      })
    }
  }
}
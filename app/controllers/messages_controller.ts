// @ts-nocheck
import type { HttpContext } from '@adonisjs/core/http'
import Message from '#models/message'
import Agent from '#models/agent'
import User from '#models/user'

export default class MessagesController {
  /**
   * Create a new message from contact form
   */
  async store({ request, response, auth }: HttpContext) {
    try {
      const data = request.only([
        'agentId',
        'subject',
        'message',
        'name',
        'email',
        'phone'
      ])

      const user = auth.user // May be null for unauthenticated users

      // Find the agent to get agency info
      let agencyId = null
      const agent = await Agent.query()
        .where('id', data.agentId)
        .preload('agency')
        .first()

      if (agent && agent.agency) {
        agencyId = agent.agency.id
      } else {
        // Check if it's a user agent
        const userAgent = await User.query()
          .where('id', data.agentId)
          .whereIn('role', ['agent', 'agency_admin'])
          .first()

        // For user agents, we'll set agency_id to null for now
        // In the future, you might want to add agency relationships to users
      }

      const message = await Message.create({
        fromUserId: user?.id || null,
        toUserId: data.agentId, // Agent receiving the message
        agentId: data.agentId,
        agencyId: agencyId,
        subject: data.subject,
        message: data.message,
        name: data.name,
        email: data.email,
        phone: data.phone,
        status: 'pending',
        isFromContactForm: true
      })

      return response.created({
        success: true,
        data: message,
        message: 'Mensaje enviado exitosamente'
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Error al enviar mensaje',
        error: error.message
      })
    }
  }

  /**
   * Get messages for dashboard (agent or agency_admin view)
   */
  async index({ request, response, auth }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const page = request.input('page', 1)
      const limit = request.input('limit', 10)
      const status = request.input('status') // Filter by status

      let messagesQuery = Message.query()
        .preload('fromUser')
        .preload('agent')
        .preload('agency')
        .orderBy('created_at', 'desc')

      if (user.role === 'agent') {
        // Agent can only see messages for themselves
        messagesQuery = messagesQuery.where('agent_id', user.id)
      } else if (user.role === 'agency_admin') {
        // Agency admin can see all messages for their agency
        const userAgency = await User.query()
          .where('id', user.id)
          .whereIn('role', ['agency_admin'])
          .first()

        if (userAgency) {
          // Get messages for all agents in this agency
          messagesQuery = messagesQuery.where((builder) => {
            builder
              .where('agency_id', user.id) // If agency_id is the user's ID
              .orWhere('agent_id', user.id) // Or messages for this specific agent
          })
        }
      } else {
        return response.forbidden({
          success: false,
          message: 'No tienes permisos para ver mensajes'
        })
      }

      if (status) {
        messagesQuery = messagesQuery.where('status', status)
      }

      const messages = await messagesQuery.paginate(page, limit)

      return response.ok({
        success: true,
        data: messages,
        message: 'Mensajes obtenidos exitosamente'
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Error al obtener mensajes',
        error: error.message
      })
    }
  }

  /**
   * Get a specific message
   */
  async show({ params, response, auth }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const messageId = params.id

      const message = await Message.query()
        .where('id', messageId)
        .preload('fromUser')
        .preload('agent')
        .preload('agency')
        .first()

      if (!message) {
        return response.notFound({
          success: false,
          message: 'Mensaje no encontrado'
        })
      }

      // Check permissions
      if (user.role === 'agent' && message.agentId !== user.id) {
        return response.forbidden({
          success: false,
          message: 'No tienes permisos para ver este mensaje'
        })
      }

      // Mark as read if it's the agent viewing it
      if (message.status === 'pending' && message.agentId === user.id) {
        message.status = 'read'
        await message.save()
      }

      return response.ok({
        success: true,
        data: message,
        message: 'Mensaje obtenido exitosamente'
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Error al obtener mensaje',
        error: error.message
      })
    }
  }

  /**
   * Update message status
   */
  async updateStatus({ params, request, response, auth }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const messageId = params.id
      const { status } = request.only(['status'])

      const message = await Message.find(messageId)

      if (!message) {
        return response.notFound({
          success: false,
          message: 'Mensaje no encontrado'
        })
      }

      // Check permissions
      if (user.role === 'agent' && message.agentId !== user.id) {
        return response.forbidden({
          success: false,
          message: 'No tienes permisos para actualizar este mensaje'
        })
      }

      message.status = status
      await message.save()

      return response.ok({
        success: true,
        data: message,
        message: 'Estado del mensaje actualizado exitosamente'
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Error al actualizar mensaje',
        error: error.message
      })
    }
  }
}
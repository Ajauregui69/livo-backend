import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, beforeCreate } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { randomUUID } from 'node:crypto'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export default class AiConversation extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare sessionId: string

  @column()
  declare conversationHistory: Message[]

  @column()
  declare contextData: object | null

  @column()
  declare conversationType: 'document_request' | 'analysis_explanation' | 'general_help'

  @column()
  declare isActive: boolean

  @column.dateTime()
  declare lastMessageAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relationships
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  // Hooks
  @beforeCreate()
  static async generateUuid(conversation: AiConversation) {
    if (!conversation.id) {
      conversation.id = randomUUID()
    }
    if (!conversation.sessionId) {
      conversation.sessionId = randomUUID()
    }
  }

  // Helper methods
  get conversationTypeDescription(): string {
    const types = {
      'document_request': 'Solicitud de Documentos',
      'analysis_explanation': 'Explicación de Análisis',
      'general_help': 'Ayuda General'
    }
    return types[this.conversationType] || 'Desconocido'
  }

  get messageCount(): number {
    return this.conversationHistory?.length || 0
  }

  get lastUserMessage(): Message | null {
    if (!this.conversationHistory) return null
    
    const userMessages = this.conversationHistory.filter(msg => msg.role === 'user')
    return userMessages[userMessages.length - 1] || null
  }

  get lastAssistantMessage(): Message | null {
    if (!this.conversationHistory) return null
    
    const assistantMessages = this.conversationHistory.filter(msg => msg.role === 'assistant')
    return assistantMessages[assistantMessages.length - 1] || null
  }

  addMessage(role: 'user' | 'assistant', content: string) {
    if (!this.conversationHistory) {
      this.conversationHistory = []
    }
    
    this.conversationHistory.push({
      role,
      content,
      timestamp: DateTime.now().toISO()
    })
    
    this.lastMessageAt = DateTime.now()
  }
}
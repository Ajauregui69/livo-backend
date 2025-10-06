import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, beforeCreate } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Agent from '#models/agent'
import Agency from '#models/agency'
import { randomUUID } from 'node:crypto'

export default class Message extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare fromUserId: string // Who sent the message

  @column()
  declare toUserId: string // Who receives the message (agent)

  @column()
  declare agentId: string // Agent this message is about/to

  @column()
  declare agencyId: string | null // Agency the agent belongs to

  @column()
  declare subject: string

  @column()
  declare message: string

  @column()
  declare name: string // Contact name

  @column()
  declare email: string // Contact email

  @column()
  declare phone: string | null // Contact phone

  @column()
  declare status: 'pending' | 'read' | 'replied' | 'closed'

  @column()
  declare isFromContactForm: boolean // True if from contact form, false if from dashboard

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static async generateUuid(message: Message) {
    if (!message.id) {
      message.id = randomUUID()
    }
  }

  // Relationships
  @belongsTo(() => User, { foreignKey: 'fromUserId' })
  declare fromUser: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'toUserId' })
  declare toUser: BelongsTo<typeof User>

  @belongsTo(() => Agent)
  declare agent: BelongsTo<typeof Agent>

  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>
}
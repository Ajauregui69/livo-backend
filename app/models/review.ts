import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, beforeCreate } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Agent from '#models/agent'
import Agency from '#models/agency'
import { randomUUID } from 'node:crypto'

export default class Review extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare agentId: string

  @column()
  declare agencyId: string

  @column()
  declare rating: number // 1-5 stars

  @column()
  declare title: string

  @column()
  declare comment: string

  @column()
  declare isApproved: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static async generateUuid(review: Review) {
    if (!review.id) {
      review.id = randomUUID()
    }
  }

  // Relationships
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Agent)
  declare agent: BelongsTo<typeof Agent>

  @belongsTo(() => Agency)
  declare agency: BelongsTo<typeof Agency>
}
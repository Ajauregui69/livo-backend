import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, beforeCreate } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Property from '#models/property'
import { randomUUID } from 'node:crypto'

export default class PropertyInquiry extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare propertyId: string

  @column()
  declare name: string

  @column()
  declare phone: string | null

  @column()
  declare email: string

  @column()
  declare inquiryType: string | null

  @column()
  declare message: string

  @column()
  declare agreeToTerms: boolean

  @column()
  declare status: 'pending' | 'contacted' | 'closed'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static async generateUuid(inquiry: PropertyInquiry) {
    if (!inquiry.id) {
      inquiry.id = randomUUID()
    }
  }

  // Relationships
  @belongsTo(() => Property)
  declare property: BelongsTo<typeof Property>
}
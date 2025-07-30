import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, beforeCreate } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Property from '#models/property'
import { randomUUID } from 'node:crypto'

export default class Agent extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  // Basic Info
  @column()
  declare name: string

  @column()
  declare email: string | null

  @column()
  declare image: string | null

  @column()
  declare city: string | null

  @column()
  declare category: string | null // Specialization like "Office", "Apartments", etc.

  // Company Info
  @column()
  declare company: string | null

  @column({ columnName: 'broker_address' })
  declare brokerAddress: string | null

  // Contact Info
  @column({ columnName: 'phone_1' })
  declare phone1: string | null

  @column({ columnName: 'phone_2' })
  declare phone2: string | null

  @column({ columnName: 'office_phone' })
  declare officePhone: string | null

  @column({ columnName: 'mobile_phone' })
  declare mobilePhone: string | null

  @column()
  declare fax: string | null

  @column()
  declare website: string | null

  // Professional Info
  @column.date({ columnName: 'member_since' })
  declare memberSince: DateTime | null

  @column()
  declare rating: number | null

  @column({ columnName: 'reviews_count' })
  declare reviewsCount: number

  @column()
  declare bio: string | null

  // Social Media
  @column({
    columnName: 'social_media',
    serialize: (value: any) => value,
    prepare: (value: any) => JSON.stringify(value)
  })
  declare socialMedia: { [key: string]: string } | null

  // Status
  @column({ columnName: 'is_active' })
  declare isActive: boolean

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @beforeCreate()
  static async generateUuid(agent: Agent) {
    if (!agent.id) {
      agent.id = randomUUID()
    }
  }

  // Relationships
  @hasMany(() => Property, {
    foreignKey: 'agentId'
  })
  declare properties: HasMany<typeof Property>

  // Computed properties
  get fullContactInfo() {
    const contacts = []
    if (this.phone1) contacts.push(this.phone1)
    if (this.phone2) contacts.push(this.phone2)
    if (this.email) contacts.push(this.email)
    return contacts.join(' | ')
  }

  get averageRating() {
    return this.rating || 0
  }

  // Scopes
  static active = (query: any) => {
    return query.where('is_active', true)
  }

  static byCity = (query: any, city: string) => {
    return query.where('city', city)
  }

  static byCategory = (query: any, category: string) => {
    return query.where('category', category)
  }
}
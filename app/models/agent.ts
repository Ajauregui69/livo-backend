import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { BaseModel, column, hasMany, belongsTo, beforeCreate } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import Property from '#models/property'
import Agency from '#models/agency'
import User from '#models/user'
import { randomUUID } from 'node:crypto'

export default class Agent extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  // Note: name, email, password are now handled by the related User model

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

  // Agency relationship
  @column({ columnName: 'agency_id' })
  declare agencyId: string | null

  // User relationship
  @column({ columnName: 'user_id' })
  declare userId: string | null

  // Status
  @column({ columnName: 'is_active' })
  declare isActive: boolean

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @beforeCreate()
  static async generateUuid(agent: Agent) {
    console.log('🏗️ Agent beforeCreate hook called')
    if (!agent.id) {
      agent.id = randomUUID()
      console.log('🆔 Generated UUID:', agent.id)
    }
    // Note: Password hashing is now handled by the User model
  }

  // Relationships
  @belongsTo(() => Agency, {
    foreignKey: 'agencyId'
  })
  declare agency: BelongsTo<typeof Agency>

  @belongsTo(() => User, {
    foreignKey: 'userId'
  })
  declare user: BelongsTo<typeof User>

  @hasMany(() => Property, {
    foreignKey: 'agentId'
  })
  declare properties: HasMany<typeof Property>

  // Computed properties
  get name() {
    if (this.user) {
      return `${this.user.firstName} ${this.user.lastName}`.trim()
    }
    return 'Agent'
  }

  get fullContactInfo() {
    const contacts = []
    if (this.phone1) contacts.push(this.phone1)
    if (this.phone2) contacts.push(this.phone2)
    if (this.user?.email) contacts.push(this.user.email)
    return contacts.join(' | ')
  }

  get fullName() {
    if (this.user) {
      return `${this.user.firstName} ${this.user.lastName}`
    }
    return 'Agent'
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

  static byAgency = (query: any, agencyId: string) => {
    return query.where('agency_id', agencyId)
  }

  // Authentication methods for agents - now delegated to User model
  async verifyPassword(plainPassword: string): Promise<boolean> {
    console.log('🔍 Verifying password for agent:', this.fullName)

    if (!this.user) {
      console.log('❌ Agent has no associated user')
      return false
    }

    return await this.user.verifyCredentials(this.user.email, plainPassword)
  }
}
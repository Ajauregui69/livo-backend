import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, belongsTo, beforeCreate } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import Agent from '#models/agent'
import User from '#models/user'
import { randomUUID } from 'node:crypto'

export default class Agency extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  // Basic Info
  @column()
  declare name: string

  @column()
  declare logo: string | null

  @column()
  declare description: string | null

  // Contact Info
  @column()
  declare email: string | null

  @column()
  declare phone: string | null

  @column()
  declare website: string | null

  @column()
  declare address: string | null

  @column()
  declare city: string | null

  @column()
  declare state: string | null

  @column({ columnName: 'zip_code' })
  declare zipCode: string | null

  // Social Media
  @column({
    columnName: 'social_media',
    serialize: (value: any) => value,
    prepare: (value: any) => JSON.stringify(value)
  })
  declare socialMedia: { [key: string]: string } | null

  // Administrator (User who created the agency)
  @column({ columnName: 'admin_user_id' })
  declare adminUserId: string

  // Status
  @column({ columnName: 'is_active' })
  declare isActive: boolean

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @beforeCreate()
  static async generateUuid(agency: Agency) {
    if (!agency.id) {
      agency.id = randomUUID()
    }
  }

  // Relationships
  @belongsTo(() => User, {
    foreignKey: 'adminUserId'
  })
  declare admin: BelongsTo<typeof User>

  @hasMany(() => Agent, {
    foreignKey: 'agencyId'
  })
  declare agents: HasMany<typeof Agent>

  // Computed properties
  get fullContactInfo() {
    const contacts = []
    if (this.phone) contacts.push(this.phone)
    if (this.email) contacts.push(this.email)
    if (this.website) contacts.push(this.website)
    return contacts.join(' | ')
  }

  get fullAddress() {
    const addressParts = []
    if (this.address) addressParts.push(this.address)
    if (this.city) addressParts.push(this.city)
    if (this.state) addressParts.push(this.state)
    if (this.zipCode) addressParts.push(this.zipCode)
    return addressParts.join(', ')
  }

  // Scopes
  static active = (query: any) => {
    return query.where('is_active', true)
  }

  static byCity = (query: any, city: string) => {
    return query.where('city', city)
  }

  static byAdminUser = (query: any, userId: string) => {
    return query.where('admin_user_id', userId)
  }

  // Validation method for unique name
  static async isNameUnique(name: string, excludeId?: string): Promise<boolean> {
    const query = Agency.query().where('name', name)
    if (excludeId) {
      query.andWhereNot('id', excludeId)
    }
    const existingAgency = await query.first()
    return !existingAgency
  }
}
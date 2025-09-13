import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, beforeCreate } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Asset from '#models/asset'
import Agent from '#models/agent'
import { randomUUID } from 'node:crypto'

export default class Property extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column({ 
    columnName: 'agent_id',
    serialize: (value: string | null | undefined) => value || null,
    prepare: (value: string | null | undefined) => value || null
  })
  declare agentId: string | null

  // Property Description
  @column()
  declare title: string

  @column()
  declare description: string | null

  @column({
    serialize: (value: string[] | null) => value,
    prepare: (value: string[] | null) => JSON.stringify(value)
  })
  declare categories: string[] | null

  @column()
  declare listingType: 'sale' | 'rent' | 'R2O'

  @column()
  declare listingStatus: 'active' | 'sold' | 'processing'

  @column()
  declare propertyStatus: 'pending' | 'processing' | 'published'

  @column()
  declare price: number

  @column()
  declare yearlyTaxRate: number | null

  @column()
  declare afterPriceLabel: string | null

  // Location
  @column()
  declare address: string

  @column()
  declare city: string | null

  @column()
  declare state: string | null

  @column()
  declare country: string | null

  @column()
  declare zip: string | null

  @column()
  declare neighborhood: string | null

  @column()
  declare latitude: number | null

  @column()
  declare longitude: number | null

  // Details
  @column()
  declare sizeSqft: number | null

  @column()
  declare lotSizeSqft: number | null

  @column()
  declare rooms: number | null

  @column()
  declare bedrooms: number | null

  @column()
  declare bathrooms: number | null

  @column()
  declare customId: string | null

  @column()
  declare garages: number | null

  @column()
  declare garageSize: string | null

  @column()
  declare yearBuilt: number | null

  @column.date()
  declare availableFrom: DateTime | null

  @column()
  declare basement: string | null

  @column()
  declare extraDetails: string | null

  @column()
  declare roofing: string | null

  @column()
  declare exteriorMaterial: string | null

  @column()
  declare structureType: string | null

  @column()
  declare ownerNotes: string | null

  // Amenities
  @column({
    serialize: (value: string[] | null) => value,
    prepare: (value: string[] | null) => JSON.stringify(value)
  })
  declare amenities: string[] | null

  // Media - Now handled by assets relationship
  // @column()
  // declare images: string[] | null

  // @column()
  // declare videos: string[] | null

  @column()
  declare virtualTourUrl: string | null

  // Additional
  @column()
  declare isFeatured: boolean

  @column()
  declare viewsCount: number

  @column()
  declare mlsNumber: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static async generateUuid(property: Property) {
    if (!property.id) {
      property.id = randomUUID()
    }
    // Ensure agentId is null if not set
    if (property.agentId === undefined) {
      property.agentId = null
    }
  }

  // Relationships
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Agent, {
    foreignKey: 'agentId',
    localKey: 'id'
  })
  declare agent: BelongsTo<typeof Agent>

  @hasMany(() => Asset)
  declare assets: HasMany<typeof Asset>

  // Computed properties
  get fullAddress() {
    const parts = [this.address, this.city, this.state, this.zip].filter(Boolean)
    return parts.join(', ')
  }

  get isActive() {
    return this.listingStatus === 'active' && this.propertyStatus === 'published'
  }

  // Scopes
  static published = (query: any) => {
    return query.where('property_status', 'published')
  }

  static active = (query: any) => {
    return query.where('listing_status', 'active')
  }

  static featured = (query: any) => {
    return query.where('is_featured', true)
  }

  // Helper methods for assets
  async getImages() {
    return Asset.getPropertyImages(this.id)
  }

  async getVideos() {
    return Asset.getPropertyVideos(this.id)
  }

  async getFeaturedImage() {
    return Asset.getFeaturedImage(this.id)
  }
}
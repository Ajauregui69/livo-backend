import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, beforeCreate } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { randomUUID } from 'node:crypto'

export default class Property extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  // Property Description
  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare categories: string[] | null

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
  @column()
  declare amenities: string[] | null

  // Media
  @column()
  declare images: string[] | null

  @column()
  declare videos: string[] | null

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
  }

  // Relationships
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

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
}
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Property from './property.js'

export default class Asset extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare propertyId: string

  @column()
  declare type: 'image' | 'video' | 'document'

  @column()
  declare fileName: string

  @column()
  declare filePath: string

  @column()
  declare fileUrl: string | null

  @column()
  declare mimeType: string | null

  @column()
  declare fileSize: number | null

  @column()
  declare altText: string | null

  @column()
  declare description: string | null

  @column()
  declare sortOrder: number

  @column()
  declare isFeatured: boolean

  @column()
  declare metadata: Record<string, any> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Property)
  declare property: BelongsTo<typeof Property>

  // Helper methods
  static async getPropertyImages(propertyId: string) {
    return this.query()
      .where('property_id', propertyId)
      .where('type', 'image')
      .orderBy('sort_order', 'asc')
      .orderBy('created_at', 'asc')
  }

  static async getPropertyVideos(propertyId: string) {
    return this.query()
      .where('property_id', propertyId)
      .where('type', 'video')
      .orderBy('sort_order', 'asc')
      .orderBy('created_at', 'asc')
  }

  static async getFeaturedImage(propertyId: string) {
    return this.query()
      .where('property_id', propertyId)
      .where('type', 'image')
      .where('is_featured', true)
      .first()
  }

  get fullUrl() {
    if (this.fileUrl) {
      return this.fileUrl
    }
    // Return relative path for locally stored files
    return `/uploads/${this.filePath}`
  }
}
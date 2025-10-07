// @ts-nocheck
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Property from './property.js'
import Room from './room.js'

export default class FloorPlan extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare propertyId: string

  @column()
  declare floorNumber: number // -1 for basement, 0 for ground, 1 for first, etc.

  @column()
  declare title: string

  @column()
  declare floorType: 'basement' | 'ground' | 'main' | 'attic' | 'other'

  @column()
  declare sizeSqft: number | null

  @column()
  declare bedrooms: number | null

  @column()
  declare bathrooms: number | null // Can have half baths like 1.5, 2.5

  @column()
  declare pricePerFloor: number | null

  @column()
  declare blueprintImage: string | null

  @column()
  declare description: string | null

  @column()
  declare sortOrder: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Property)
  declare property: BelongsTo<typeof Property>

  @hasMany(() => Room)
  declare rooms: HasMany<typeof Room>

  // Helper methods
  static async getPropertyFloorPlans(propertyId: string) {
    return this.query()
      .where('property_id', propertyId)
      .preload('rooms')
      .orderBy('sort_order', 'asc')
      .orderBy('floor_number', 'asc')
  }

  get floorLabel() {
    // Convert floor number to label format used in frontend
    switch (this.floorNumber) {
      case -1:
        return 'basement'
      case 0:
        return 'ground-floor'
      case 1:
        return 'first-floor'
      case 2:
        return 'second-floor'
      case 3:
        return 'third-floor'
      default:
        if (this.floorType === 'attic') return 'attic'
        return 'other'
    }
  }
}
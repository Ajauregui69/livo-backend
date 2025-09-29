import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, beforeCreate } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { randomUUID } from 'node:crypto'

export default class Blog extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare title: string

  @column()
  declare slug: string

  @column()
  declare excerpt: string

  @column()
  declare content: string

  @column()
  declare featuredImage: string | null

  @column()
  declare authorId: string

  @column()
  declare category: string

  @column({
    serialize: (value: string[] | null) => value,
    prepare: (value: string[] | null) => JSON.stringify(value)
  })
  declare tags: string[] | null

  @column()
  declare isPublished: boolean

  @column()
  declare readingTime: number // minutos estimados

  @column()
  declare viewsCount: number

  @column.dateTime()
  declare publishedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static async generateUuid(blog: Blog) {
    if (!blog.id) {
      blog.id = randomUUID()
    }
  }

  // Relationships
  @belongsTo(() => User, {
    foreignKey: 'authorId'
  })
  declare author: BelongsTo<typeof User>

  // Helper methods
  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }
}
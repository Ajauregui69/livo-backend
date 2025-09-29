import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'blogs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('title').notNullable()
      table.string('slug').notNullable().unique()
      table.text('excerpt').notNullable()
      table.text('content').notNullable()
      table.string('featured_image').nullable()
      table.string('author_id').notNullable()
      table.string('category').notNullable()
      table.json('tags').nullable()
      table.boolean('is_published').defaultTo(false)
      table.integer('reading_time').unsigned().defaultTo(5)
      table.integer('views_count').unsigned().defaultTo(0)
      table.timestamp('published_at').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Índices para SEO y búsqueda
      table.index(['slug'])
      table.index(['is_published', 'published_at'])
      table.index(['category'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
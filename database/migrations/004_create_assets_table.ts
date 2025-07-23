import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'assets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      table.uuid('property_id').references('id').inTable('properties').onDelete('CASCADE')
      table.string('type').notNullable() // 'image', 'video', 'document'
      table.string('file_name').notNullable()
      table.string('file_path').notNullable()
      table.string('file_url').nullable() // For external URLs or CDN links
      table.string('mime_type').nullable()
      table.integer('file_size').nullable() // in bytes
      table.string('alt_text').nullable()
      table.text('description').nullable()
      table.integer('sort_order').defaultTo(0)
      table.boolean('is_featured').defaultTo(false) // Main property image
      table.json('metadata').nullable() // For additional properties like dimensions, duration, etc.
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
      
      table.index(['property_id'])
      table.index(['type'])
      table.index(['sort_order'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'agents'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary()
      
      // Basic Info
      table.string('name').notNullable()
      table.string('email').nullable()
      table.string('image').nullable()
      table.string('city').nullable()
      table.string('category').nullable() // Specialization
      
      // Company Info
      table.string('company').nullable()
      table.string('broker_address').nullable()
      
      // Contact Info
      table.string('phone_1').nullable()
      table.string('phone_2').nullable()
      table.string('office_phone').nullable()
      table.string('mobile_phone').nullable()
      table.string('fax').nullable()
      table.string('website').nullable()
      
      // Professional Info
      table.date('member_since').nullable()
      table.decimal('rating', 3, 2).nullable().defaultTo(0) // 0.00 to 5.00
      table.integer('reviews_count').defaultTo(0)
      table.text('bio').nullable()
      
      // Social Media (JSON)
      table.json('social_media').nullable()
      
      // Status
      table.boolean('is_active').defaultTo(true)
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
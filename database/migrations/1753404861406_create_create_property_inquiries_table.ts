import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'property_inquiries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('property_id').notNullable().references('id').inTable('properties').onDelete('CASCADE')
      table.string('name').notNullable()
      table.string('phone').notNullable()
      table.string('email').notNullable()
      table.string('inquiry_type').notNullable()
      table.text('message').notNullable()
      table.boolean('agree_to_terms').notNullable().defaultTo(false)
      table.enum('status', ['pending', 'contacted', 'closed']).notNullable().defaultTo('pending')

      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
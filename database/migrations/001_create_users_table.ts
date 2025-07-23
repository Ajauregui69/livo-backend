import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    // Enable uuid-ossp extension for PostgreSQL
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      table.string('first_name', 50).notNullable()
      table.string('last_name', 50).notNullable()
      table.string('email', 254).notNullable().unique()
      table.string('phone', 20).nullable()
      table.string('password', 180).notNullable()
      table.enum('role', ['agent', 'broker', 'developer', 'comprador', 'admin']).defaultTo('agent')
      table.enum('status', ['active', 'inactive', 'pending']).defaultTo('pending')
      table.string('company_name', 100).nullable()
      table.string('license_number', 50).nullable()
      table.json('preferences').nullable()
      table.timestamp('email_verified_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
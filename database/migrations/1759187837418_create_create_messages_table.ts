import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary()
      table.string('from_user_id').nullable()
      table.string('to_user_id').nullable()
      table.string('agent_id').notNullable() // Can be agent.id or user.id for user agents
      table.string('agency_id').nullable()
      table.string('subject').notNullable()
      table.text('message').notNullable()
      table.string('name').notNullable() // Contact name
      table.string('email').notNullable() // Contact email
      table.string('phone').nullable() // Contact phone
      table.enum('status', ['pending', 'read', 'replied', 'closed']).defaultTo('pending')
      table.boolean('is_from_contact_form').defaultTo(true)
      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Indexes
      table.index(['agent_id'])
      table.index(['agency_id'])
      table.index(['from_user_id'])
      table.index(['to_user_id'])
      table.index(['status'])
      table.index(['created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
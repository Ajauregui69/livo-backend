import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ai_conversations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable()
      table.string('session_id', 100).notNullable() // Para agrupar conversaciones
      table.json('conversation_history').notNullable() // Array de mensajes
      table.json('context_data').nullable() // Contexto del usuario para el AI
      table.enum('conversation_type', ['document_request', 'analysis_explanation', 'general_help']).notNullable()
      table.boolean('is_active').defaultTo(true)
      table.timestamp('last_message_at').notNullable()
      table.timestamps(true, true)

      // Índices
      table.index(['user_id'])
      table.index(['session_id'])
      table.index(['conversation_type'])
      table.index(['is_active'])
      table.index(['last_message_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
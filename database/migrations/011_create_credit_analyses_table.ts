import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'credit_analyses'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable()
      table.json('moonshot_analysis').nullable() // Respuesta completa del AI
      table.integer('internal_score').nullable().checkBetween([0, 1000]) // Score 0-1000
      table.enum('risk_level', ['low', 'medium', 'high']).nullable()
      table.text('recommendations').nullable()
      table.enum('status', ['pending', 'processing', 'completed', 'failed']).defaultTo('pending')
      table.decimal('max_loan_amount', 15, 2).nullable() // Monto máximo recomendado
      table.decimal('suggested_down_payment', 15, 2).nullable() // Enganche sugerido
      table.json('analysis_details').nullable() // Detalles del análisis
      table.timestamp('processed_at').nullable()
      table.timestamp('expires_at').nullable() // Análisis válido por X tiempo
      table.timestamps(true, true)

      // Índices para consultas rápidas
      table.index(['user_id'])
      table.index(['status'])
      table.index(['processed_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'credit_scores'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.integer('credit_score').notNullable().comment('Puntaje de crédito (456-760)')
      table.decimal('estimated_income', 12, 2).nullable().comment('Ingreso estimado mensual en MXN')
      table.decimal('max_budget', 12, 2).nullable().comment('Presupuesto máximo para propiedad en MXN')
      table.enum('risk_level', ['low', 'medium', 'high']).notNullable().comment('Nivel de riesgo crediticio')
      table.string('bureau_report_id').nullable().comment('ID del reporte de buró (simulado)')
      table.boolean('is_active').defaultTo(true).comment('Si el score está activo')
      table.text('notes').nullable().comment('Notas adicionales sobre el score')
      table.timestamp('checked_at').notNullable().comment('Fecha del chequeo crediticio')
      table.timestamp('expires_at').nullable().comment('Fecha de expiración del score')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
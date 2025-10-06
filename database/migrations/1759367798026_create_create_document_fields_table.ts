import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'document_fields'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('document_upload_id').notNullable().references('id').inTable('document_uploads').onDelete('CASCADE')
      table.uuid('document_review_id').nullable().references('id').inTable('document_reviews').onDelete('SET NULL')

      table.string('field_name', 100).notNullable() // Ej: 'monthly_income', 'bank_balance', 'full_name'
      table.string('field_type', 50).notNullable() // 'text', 'number', 'date', 'currency'
      table.text('extracted_value').nullable() // Valor extraído automáticamente
      table.text('reviewed_value').nullable() // Valor corregido por humano
      table.integer('confidence').nullable() // 0-100
      table.string('extraction_method', 50).nullable() // 'regex', 'pattern', 'manual'
      table.boolean('was_corrected').defaultTo(false)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indices para búsquedas rápidas
      table.index(['document_upload_id', 'field_name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
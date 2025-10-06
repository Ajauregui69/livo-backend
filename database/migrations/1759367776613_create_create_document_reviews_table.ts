import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'document_reviews'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('document_upload_id').notNullable().references('id').inTable('document_uploads').onDelete('CASCADE')
      table.uuid('reviewer_user_id').nullable().references('id').inTable('users').onDelete('SET NULL')

      table.enum('status', ['pending', 'in_review', 'completed', 'skipped']).defaultTo('pending')
      table.integer('confidence_score').nullable() // 0-100
      table.text('extraction_notes').nullable()
      table.jsonb('auto_extracted_data').nullable() // Datos extraídos automáticamente
      table.jsonb('reviewed_data').nullable() // Datos corregidos por humano
      table.jsonb('field_corrections').nullable() // Qué campos corrigió el humano

      table.timestamp('assigned_at').nullable()
      table.timestamp('reviewed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
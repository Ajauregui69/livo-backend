import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'document_uploads'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable()
      table.string('file_name', 255).notNullable()
      table.string('file_path', 500).notNullable()
      table.string('file_size', 50).nullable() // En bytes
      table.string('mime_type', 100).nullable()
      table.enum('document_type', [
        'bank_statement', 
        'payroll', 
        'tax_return', 
        'id_document', 
        'proof_of_address',
        'employment_letter',
        'other'
      ]).notNullable()
      table.enum('status', ['uploaded', 'processing', 'processed', 'failed']).defaultTo('uploaded')
      table.json('extracted_data').nullable() // Datos extraídos por OCR/AI
      table.text('processing_notes').nullable() // Notas del procesamiento
      table.timestamp('processed_at').nullable()
      table.timestamps(true, true)

      // Índices
      table.index(['user_id'])
      table.index(['document_type'])
      table.index(['status'])
      table.index(['processed_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
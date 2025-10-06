import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'extraction_rules'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.string('name', 100).notNullable() // Ej: 'Extract monthly income from payroll'
      table.enum('document_type', ['bank_statement', 'payroll', 'tax_return', 'id_document', 'proof_of_address', 'employment_letter', 'other']).notNullable()
      table.string('field_name', 100).notNullable() // Campo que extrae
      table.text('pattern').notNullable() // Regex o patrón
      table.string('pattern_type', 50).defaultTo('regex') // 'regex', 'keyword', 'position'
      table.jsonb('context_keywords').nullable() // Palabras clave alrededor del patrón
      table.integer('priority').defaultTo(0) // Para ordenar reglas
      table.boolean('is_active').defaultTo(true)
      table.text('description').nullable()
      table.integer('success_count').defaultTo(0) // Cuántas veces ha funcionado
      table.integer('failure_count').defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indices
      table.index(['document_type', 'is_active'])
      table.index(['field_name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
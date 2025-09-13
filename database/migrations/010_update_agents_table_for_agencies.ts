import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'agents'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('password').nullable()
      table.uuid('agency_id').nullable()
      table.enum('role', ['admin', 'agent']).defaultTo('agent')

      // Foreign key constraint
      table.foreign('agency_id').references('id').inTable('agencies').onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['agency_id'])
      table.dropColumn('password')
      table.dropColumn('agency_id')
      table.dropColumn('role')
    })
  }
}
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'reviews'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('agency_id').notNullable().after('agent_id')
      table.index(['agency_id', 'is_approved'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('agency_id')
    })
  }
}
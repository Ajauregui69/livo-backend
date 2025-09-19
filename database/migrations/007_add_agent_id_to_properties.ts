import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'properties'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('agent_id').nullable().defaultTo(null).references('agents.id').onDelete('SET NULL')
    })
  }

  async down() {
    const hasColumn = await this.schema.hasColumn(this.tableName, 'agent_id')
    if (hasColumn) {
      this.schema.alterTable(this.tableName, (table) => {
        table.dropColumn('agent_id')
      })
    }
  }
}
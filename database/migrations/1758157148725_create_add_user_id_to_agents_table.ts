import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'agents'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('user_id').nullable().index()
      // Note: Foreign key constraint will be added later after data cleanup
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('user_id')
    })
  }
}
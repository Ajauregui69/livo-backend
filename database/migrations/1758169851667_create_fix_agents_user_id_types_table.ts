import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'agents'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Change user_id from character varying to uuid
      table.uuid('user_id').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Revert back to character varying
      table.string('user_id').nullable().alter()
    })
  }
}
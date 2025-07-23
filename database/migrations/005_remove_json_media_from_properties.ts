import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'properties'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Remove JSON columns that will be replaced by assets table
      table.dropColumn('images')
      table.dropColumn('videos')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Restore JSON columns for rollback
      table.json('images').nullable()
      table.json('videos').nullable()
    })
  }
}
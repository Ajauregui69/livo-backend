import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'property_inquiries'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('phone').nullable().alter()
      table.string('inquiry_type').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('phone').notNullable().alter()
      table.string('inquiry_type').notNullable().alter()
    })
  }
}
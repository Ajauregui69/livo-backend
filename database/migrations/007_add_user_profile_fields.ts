import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('monthly_income', 15, 2).nullable()
      table.string('employment', 50).nullable()
      table.string('work_years', 20).nullable()
      table.string('address', 255).nullable()
      table.string('city', 100).nullable()
      table.string('state', 100).nullable()
      table.string('zip_code', 10).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('monthly_income')
      table.dropColumn('employment')
      table.dropColumn('work_years')
      table.dropColumn('address')
      table.dropColumn('city')
      table.dropColumn('state')
      table.dropColumn('zip_code')
    })
  }
}
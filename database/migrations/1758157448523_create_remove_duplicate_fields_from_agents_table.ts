import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'agents'

  async up() {
    // Check if columns exist before dropping them
    const hasName = await this.schema.hasColumn(this.tableName, 'name')
    const hasEmail = await this.schema.hasColumn(this.tableName, 'email')
    const hasPassword = await this.schema.hasColumn(this.tableName, 'password')

    if (hasName || hasEmail || hasPassword) {
      this.schema.alterTable(this.tableName, (table) => {
        // Remove duplicate fields that exist in users table
        if (hasName) table.dropColumn('name')        // Use users.firstName + users.lastName
        if (hasEmail) table.dropColumn('email')      // Use users.email
        if (hasPassword) table.dropColumn('password') // Use users.password
      })
    }
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Restore the dropped columns
      table.string('name').nullable()
      table.string('email').nullable()
      table.string('password').nullable()
    })
  }
}
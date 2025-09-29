import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'reviews'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('user_id').notNullable()
      table.string('agent_id').notNullable()
      table.integer('rating').unsigned().notNullable().checkBetween([1, 5])
      table.string('title').notNullable()
      table.text('comment').notNullable()
      table.boolean('is_approved').defaultTo(false)

      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Índices para mejor rendimiento
      table.index(['agent_id', 'is_approved'])
      table.index(['rating'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
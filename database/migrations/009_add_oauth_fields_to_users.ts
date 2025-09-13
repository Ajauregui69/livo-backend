import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    // Esta migración se omite porque las columnas oauth ya existen
    // Solo agregamos el índice si no existe
    try {
      this.schema.alterTable(this.tableName, (table) => {
        table.index(['oauth_provider', 'oauth_id'])
      })
    } catch (error) {
      // Índice ya existe, ignorar
      console.log('OAuth index already exists, skipping...')
    }
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['oauth_provider', 'oauth_id'])
    })
  }
}
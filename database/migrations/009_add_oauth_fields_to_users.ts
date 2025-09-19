import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    // Verificar si las columnas oauth existen, si no, crearlas
    const hasOauthProvider = await this.schema.hasColumn(this.tableName, 'oauth_provider')
    const hasOauthId = await this.schema.hasColumn(this.tableName, 'oauth_id')

    this.schema.alterTable(this.tableName, (table) => {
      if (!hasOauthProvider) {
        table.string('oauth_provider').nullable()
      }
      if (!hasOauthId) {
        table.string('oauth_id').nullable()
      }
    })

    // Agregar índice solo si ambas columnas existen o fueron creadas
    if (hasOauthProvider || hasOauthId || (!hasOauthProvider && !hasOauthId)) {
      try {
        this.schema.alterTable(this.tableName, (table) => {
          table.index(['oauth_provider', 'oauth_id'])
        })
      } catch (error) {
        console.log('OAuth index already exists, skipping...')
      }
    }
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      try {
        table.dropIndex(['oauth_provider', 'oauth_id'])
      } catch (error) {
        console.log('OAuth index does not exist, skipping...')
      }
      table.dropColumn('oauth_provider')
      table.dropColumn('oauth_id')
    })
  }
}
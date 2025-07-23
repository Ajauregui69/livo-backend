import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, beforeCreate } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { randomUUID } from 'node:crypto'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare email: string

  @column()
  declare phone: string | null

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare role: 'agent' | 'broker' | 'developer' | 'comprador' | 'admin'

  @column()
  declare status: 'active' | 'inactive' | 'pending'

  @column()
  declare companyName: string | null

  @column()
  declare licenseNumber: string | null

  @column()
  declare preferences: object | null

  @column.dateTime()
  declare emailVerifiedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @beforeCreate()
  static async generateUuid(user: User) {
    if (!user.id) {
      user.id = randomUUID()
    }
  }

  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }

  static accessTokens = DbAccessTokensProvider.forModel(User)
}
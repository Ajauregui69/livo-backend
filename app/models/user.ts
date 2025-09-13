import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, beforeCreate, hasOne, hasMany } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import type { HasOne, HasMany } from '@adonisjs/lucid/types/relations'
import CreditScore from '#models/credit_score'
import Agency from '#models/agency'
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
  declare role: 'agent' | 'broker' | 'developer' | 'comprador' | 'admin' | 'agency_admin'

  @column()
  declare status: 'active' | 'inactive' | 'pending'

  @column()
  declare companyName: string | null

  @column()
  declare licenseNumber: string | null

  @column()
  declare preferences: object | null

  @column({ columnName: 'monthly_income' })
  declare monthlyIncome: number | null

  @column()
  declare employment: string | null

  @column({ columnName: 'work_years' })
  declare workYears: string | null

  @column()
  declare address: string | null

  @column()
  declare city: string | null

  @column()
  declare state: string | null

  @column({ columnName: 'zip_code' })
  declare zipCode: string | null

  @column({ columnName: 'oauth_provider' })
  declare oauthProvider: string | null

  @column({ columnName: 'oauth_id' })
  declare oauthId: string | null

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

  // Relationships
  @hasOne(() => CreditScore, {
    foreignKey: 'userId',
    localKey: 'id'
  })
  declare creditScore: HasOne<typeof CreditScore>

  @hasMany(() => Agency, {
    foreignKey: 'adminUserId'
  })
  declare agencies: HasMany<typeof Agency>

  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }

  // Helper methods for credit
  async getCurrentCreditScore(): Promise<CreditScore | null> {
    return await CreditScore.query()
      .where('user_id', this.id)
      .where('is_active', true)
      .where((query) => {
        query.whereNull('expires_at').orWhere('expires_at', '>', new Date())
      })
      .orderBy('created_at', 'desc')
      .first()
  }

  async hasCreditCheck(): Promise<boolean> {
    const creditScore = await this.getCurrentCreditScore()
    return !!creditScore
  }

  static accessTokens = DbAccessTokensProvider.forModel(User)
}
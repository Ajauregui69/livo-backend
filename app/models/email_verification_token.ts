import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, beforeCreate } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { randomUUID, randomBytes } from 'node:crypto'

export default class EmailVerificationToken extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare email: string

  @column()
  declare token: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column()
  declare used: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static async generateUuid(token: EmailVerificationToken) {
    if (!token.id) {
      token.id = randomUUID()
    }
  }

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  /**
   * Generate a random verification token
   */
  static generateToken(): string {
    return randomBytes(32).toString('hex')
  }

  /**
   * Check if token is expired
   */
  get isExpired(): boolean {
    return this.expiresAt < DateTime.now()
  }

  /**
   * Check if token is valid (not used and not expired)
   */
  get isValid(): boolean {
    return !this.used && !this.isExpired
  }

  /**
   * Create a verification token for a user
   */
  static async createForUser(userId: string, email: string): Promise<EmailVerificationToken> {
    const token = this.generateToken()
    const expiresAt = DateTime.now().plus({ hours: 24 }) // Token expires in 24 hours

    return await this.create({
      userId,
      email,
      token,
      expiresAt,
      used: false
    })
  }

  /**
   * Find valid token by token string
   */
  static async findValidToken(token: string): Promise<EmailVerificationToken | null> {
    const verificationToken = await this.query()
      .where('token', token)
      .where('used', false)
      .where('expires_at', '>', DateTime.now().toSQL())
      .first()

    return verificationToken
  }
}
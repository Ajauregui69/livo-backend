import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { randomUUID } from 'node:crypto'

export default class CreditAnalysis extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare moonshotAnalysis: object | null

  @column()
  declare internalScore: number | null

  @column()
  declare riskLevel: 'low' | 'medium' | 'high' | null

  @column()
  declare recommendations: string | null

  @column()
  declare status: 'pending' | 'processing' | 'completed' | 'failed'

  @column()
  declare maxLoanAmount: number | null

  @column()
  declare suggestedDownPayment: number | null

  @column()
  declare analysisDetails: object | null

  @column.dateTime()
  declare processedAt: DateTime | null

  @column.dateTime()
  declare expiresAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relationships
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  // Hooks
  static async beforeCreate(creditAnalysis: CreditAnalysis) {
    if (!creditAnalysis.id) {
      creditAnalysis.id = randomUUID()
    }
  }

  // Helper methods
  get isExpired(): boolean {
    if (!this.expiresAt) return false
    return this.expiresAt < DateTime.now()
  }

  get scoreDescription(): string {
    if (!this.internalScore) return 'Sin evaluar'
    
    if (this.internalScore >= 800) return 'Excelente'
    if (this.internalScore >= 700) return 'Muy Bueno'
    if (this.internalScore >= 600) return 'Bueno'
    if (this.internalScore >= 500) return 'Regular'
    return 'Bajo'
  }

  get riskLevelDescription(): string {
    switch (this.riskLevel) {
      case 'low': return 'Riesgo Bajo'
      case 'medium': return 'Riesgo Moderado'
      case 'high': return 'Riesgo Alto'
      default: return 'Sin evaluar'
    }
  }
}
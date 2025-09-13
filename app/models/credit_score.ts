import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, beforeCreate } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { randomUUID } from 'node:crypto'

export default class CreditScore extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare creditScore: number

  @column()
  declare estimatedIncome: number | null

  @column()
  declare maxBudget: number | null

  @column()
  declare riskLevel: 'low' | 'medium' | 'high'

  @column()
  declare bureauReportId: string | null

  @column()
  declare isActive: boolean

  @column()
  declare notes: string | null

  @column.dateTime()
  declare checkedAt: DateTime

  @column.dateTime()
  declare expiresAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @beforeCreate()
  static async generateUuid(creditScore: CreditScore) {
    if (!creditScore.id) {
      creditScore.id = randomUUID()
    }
  }

  // Relationships
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  // Helper methods
  static getRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 700) return 'low'
    if (score >= 600) return 'medium'
    return 'high'
  }

  static calculateMaxBudget(score: number, estimatedIncome?: number): number {
    const baseMultiplier = estimatedIncome ? estimatedIncome * 0.3 : 25000 // 30% of income or default
    
    if (score >= 700) return baseMultiplier * 48 // 4 años de pagos
    if (score >= 650) return baseMultiplier * 36 // 3 años de pagos
    if (score >= 600) return baseMultiplier * 24 // 2 años de pagos
    if (score >= 550) return baseMultiplier * 18 // 1.5 años de pagos
    return baseMultiplier * 12 // 1 año de pagos
  }

  get isExpired(): boolean {
    if (!this.expiresAt) return false
    return this.expiresAt < DateTime.now()
  }

  get scoreDescription(): string {
    if (this.creditScore >= 700) return 'Excelente'
    if (this.creditScore >= 650) return 'Muy Bueno'
    if (this.creditScore >= 600) return 'Bueno'
    if (this.creditScore >= 550) return 'Regular'
    return 'Necesita Mejorar'
  }

  get riskDescription(): string {
    switch (this.riskLevel) {
      case 'low': return 'Bajo Riesgo'
      case 'medium': return 'Riesgo Moderado'
      case 'high': return 'Alto Riesgo'
      default: return 'No Evaluado'
    }
  }
}
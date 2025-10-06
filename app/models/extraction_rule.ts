import { DateTime } from 'luxon'
import { BaseModel, column, beforeCreate } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'

export default class ExtractionRule extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare documentType: 'bank_statement' | 'payroll' | 'tax_return' | 'id_document' | 'proof_of_address' | 'employment_letter' | 'other'

  @column()
  declare fieldName: string

  @column()
  declare pattern: string

  @column()
  declare patternType: string

  @column({
    prepare: (value: string[] | null) => {
      if (!value) return null
      // If already a string (from DB), return as-is
      if (typeof value === 'string') return value
      // If array, convert to JSON
      return JSON.stringify(value)
    },
    consume: (value: any) => {
      if (!value) return null
      // If already an array, return as-is
      if (Array.isArray(value)) return value
      // If string, parse it
      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch {
          return null
        }
      }
      return null
    }
  })
  declare contextKeywords: string[] | null

  @column()
  declare priority: number

  @column()
  declare isActive: boolean

  @column()
  declare description: string | null

  @column()
  declare successCount: number

  @column()
  declare failureCount: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Hooks
  @beforeCreate()
  static async generateUuid(rule: ExtractionRule) {
    if (!rule.id) {
      rule.id = randomUUID()
    }
  }

  // Helper methods
  get successRate(): number {
    const total = this.successCount + this.failureCount
    if (total === 0) return 0
    return Math.round((this.successCount / total) * 100)
  }

  get documentTypeDescription(): string {
    const types = {
      'bank_statement': 'Estado de Cuenta Bancario',
      'payroll': 'Recibo de Nómina',
      'tax_return': 'Declaración Fiscal',
      'id_document': 'Identificación Oficial',
      'proof_of_address': 'Comprobante de Domicilio',
      'employment_letter': 'Carta Laboral',
      'other': 'Otro'
    }
    return types[this.documentType] || 'Desconocido'
  }

  // Método para probar el patrón
  tryExtract(text: string): { success: boolean; value: string | null; confidence: number } {
    try {
      if (this.patternType === 'regex') {
        const regex = new RegExp(this.pattern, 'i')
        const match = text.match(regex)

        if (match) {
          const value = match[1] || match[0] // Primer grupo de captura o todo el match
          return {
            success: true,
            value: value.trim(),
            confidence: this.calculateConfidence(text, value)
          }
        }
      }

      return { success: false, value: null, confidence: 0 }
    } catch (error) {
      console.error(`Error executing rule ${this.name}:`, error)
      return { success: false, value: null, confidence: 0 }
    }
  }

  private calculateConfidence(text: string, extractedValue: string): number {
    let confidence = 50 // Base confidence

    // Aumentar confianza si hay palabras clave de contexto
    if (this.contextKeywords && this.contextKeywords.length > 0) {
      const lowerText = text.toLowerCase()
      const foundKeywords = this.contextKeywords.filter(keyword =>
        lowerText.includes(keyword.toLowerCase())
      )
      confidence += (foundKeywords.length / this.contextKeywords.length) * 30
    }

    // Aumentar confianza basado en el historial de éxito
    if (this.successRate > 0) {
      confidence += (this.successRate / 100) * 20
    }

    return Math.min(Math.round(confidence), 100)
  }

  async incrementSuccess(): Promise<void> {
    this.successCount++
    await this.save()
  }

  async incrementFailure(): Promise<void> {
    this.failureCount++
    await this.save()
  }
}

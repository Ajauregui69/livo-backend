import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, beforeCreate } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import DocumentUpload from '#models/document_upload'
import DocumentReview from '#models/document_review'
import { randomUUID } from 'node:crypto'

export default class DocumentField extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare documentUploadId: string

  @column()
  declare documentReviewId: string | null

  @column()
  declare fieldName: string

  @column()
  declare fieldType: 'text' | 'number' | 'date' | 'currency'

  @column()
  declare extractedValue: string | null

  @column()
  declare reviewedValue: string | null

  @column()
  declare confidence: number | null

  @column()
  declare extractionMethod: string | null

  @column()
  declare wasCorrected: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relationships
  @belongsTo(() => DocumentUpload)
  declare documentUpload: BelongsTo<typeof DocumentUpload>

  @belongsTo(() => DocumentReview)
  declare documentReview: BelongsTo<typeof DocumentReview>

  // Hooks
  @beforeCreate()
  static async generateUuid(field: DocumentField) {
    if (!field.id) {
      field.id = randomUUID()
    }
  }

  // Helper methods
  get finalValue(): string | null {
    return this.reviewedValue || this.extractedValue
  }

  get fieldNameDescription(): string {
    const descriptions: Record<string, string> = {
      'monthly_income': 'Ingreso Mensual',
      'annual_income': 'Ingreso Anual',
      'bank_balance': 'Saldo Bancario',
      'average_balance': 'Saldo Promedio',
      'employer_name': 'Nombre del Empleador',
      'employment_start_date': 'Fecha de Inicio Laboral',
      'full_name': 'Nombre Completo',
      'curp': 'CURP',
      'rfc': 'RFC',
      'address': 'Dirección',
      'birth_date': 'Fecha de Nacimiento',
      'monthly_expenses': 'Gastos Mensuales',
      'debt_payments': 'Pagos de Deuda',
      'overdraft_count': 'Número de Sobregiros'
    }
    return descriptions[this.fieldName] || this.fieldName
  }

  get isHighConfidence(): boolean {
    return this.confidence !== null && this.confidence >= 80
  }

  get isMediumConfidence(): boolean {
    return this.confidence !== null && this.confidence >= 50 && this.confidence < 80
  }

  get isLowConfidence(): boolean {
    return this.confidence !== null && this.confidence < 50
  }
}

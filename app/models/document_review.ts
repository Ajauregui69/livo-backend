import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, beforeCreate } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import DocumentUpload from '#models/document_upload'
import User from '#models/user'
import DocumentField from '#models/document_field'
import { randomUUID } from 'node:crypto'

export default class DocumentReview extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare documentUploadId: string

  @column()
  declare reviewerUserId: string | null

  @column()
  declare status: 'pending' | 'in_review' | 'completed' | 'skipped'

  @column()
  declare confidenceScore: number | null

  @column()
  declare extractionNotes: string | null

  @column()
  declare autoExtractedData: Record<string, any> | null

  @column()
  declare reviewedData: Record<string, any> | null

  @column()
  declare fieldCorrections: Record<string, any> | null

  @column.dateTime()
  declare assignedAt: DateTime | null

  @column.dateTime()
  declare reviewedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relationships
  @belongsTo(() => DocumentUpload)
  declare documentUpload: BelongsTo<typeof DocumentUpload>

  @belongsTo(() => User, {
    foreignKey: 'reviewerUserId'
  })
  declare reviewer: BelongsTo<typeof User>

  @hasMany(() => DocumentField, {
    foreignKey: 'documentReviewId'
  })
  declare fields: HasMany<typeof DocumentField>

  // Hooks
  @beforeCreate()
  static async generateUuid(review: DocumentReview) {
    if (!review.id) {
      review.id = randomUUID()
    }
  }

  // Helper methods
  get statusDescription(): string {
    const statuses = {
      'pending': 'Pendiente de Revisión',
      'in_review': 'En Revisión',
      'completed': 'Completado',
      'skipped': 'Omitido'
    }
    return statuses[this.status] || 'Desconocido'
  }

  get needsReview(): boolean {
    return this.status === 'pending' || (this.confidenceScore !== null && this.confidenceScore < 70)
  }

  get hasCorrections(): boolean {
    return !!this.fieldCorrections && Object.keys(this.fieldCorrections).length > 0
  }
}

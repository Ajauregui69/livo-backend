import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, beforeCreate } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { randomUUID } from 'node:crypto'

export default class DocumentUpload extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare fileName: string

  @column()
  declare filePath: string

  @column()
  declare fileSize: string | null

  @column()
  declare mimeType: string | null

  @column()
  declare documentType: 'bank_statement' | 'payroll' | 'tax_return' | 'id_document' | 'proof_of_address' | 'employment_letter' | 'other'

  @column()
  declare status: 'uploaded' | 'processing' | 'processed' | 'failed'

  @column()
  declare extractedData: object | null

  @column()
  declare processingNotes: string | null

  @column.dateTime()
  declare processedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relationships
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  // Hooks
  @beforeCreate()
  static async generateUuid(document: DocumentUpload) {
    if (!document.id) {
      document.id = randomUUID()
    }
  }

  // Helper methods
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

  get statusDescription(): string {
    const statuses = {
      'uploaded': 'Subido',
      'processing': 'Procesando',
      'processed': 'Procesado',
      'failed': 'Error'
    }
    return statuses[this.status] || 'Desconocido'
  }

  get fileSizeFormatted(): string {
    if (!this.fileSize) return 'Desconocido'
    
    const bytes = parseInt(this.fileSize)
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
}
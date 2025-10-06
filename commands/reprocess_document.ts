import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import DocumentUpload from '#models/document_upload'

export default class ReprocessDocument extends BaseCommand {
  static commandName = 'document:reprocess'
  static description = 'Reprocesar un documento específico'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('🔄 Reprocesando documento...\n')

    try {
      const doc = await DocumentUpload.query()
        .where('document_type', 'bank_statement')
        .orWhere('document_type', 'payroll')
        .orWhere('document_type', 'id_document')
        .first()

      if (!doc) {
        this.logger.error('No hay documentos en la base de datos')
        return
      }

      this.logger.info(`📄 Documento: ${doc.fileName}`)
      this.logger.info(`   ID: ${doc.id}`)
      this.logger.info(`   Tipo: ${doc.documentType}`)
      this.logger.info(`   Estado actual: ${doc.status}\n`)

      // Resetear estado
      doc.status = 'uploaded'
      doc.extractedData = null
      doc.processingNotes = 'Reprocesando...'
      await doc.save()

      this.logger.info('🔍 Procesando con servicio de extracción...')
      const { documentExtractionService } = await import('#services/document_extraction_service')

      await documentExtractionService.processDocument(doc)

      await doc.refresh()

      this.logger.success(`\n✅ Completado`)
      this.logger.info(`   Estado: ${doc.status}`)
      this.logger.info(`   Notas: ${doc.processingNotes}`)

      if (doc.extractedData) {
        this.logger.info(`   Datos extraídos: ${Object.keys(doc.extractedData).length} campos`)
        this.logger.info(`\nDatos:`)
        console.log(JSON.stringify(doc.extractedData, null, 2))
      } else {
        this.logger.error(`   ❌ No se extrajeron datos`)
      }

    } catch (error) {
      this.logger.error(`\n❌ ERROR: ${error.message}`)
      this.logger.error(`Stack: ${error.stack}`)
      this.exitCode = 1
    }
  }
}

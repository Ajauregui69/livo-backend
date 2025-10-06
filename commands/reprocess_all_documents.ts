import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import DocumentUpload from '#models/document_upload'
import { documentExtractionService } from '#services/document_extraction_service'

export default class ReprocessAllDocuments extends BaseCommand {
  static commandName = 'documents:reprocess-all'
  static description = 'Reprocesar todos los documentos para aplicar nuevas reglas de extracción y análisis'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('🔄 Iniciando reprocesamiento de todos los documentos...')

    try {
      // Obtener todos los documentos
      const documents = await DocumentUpload.query()
        .whereIn('status', ['uploaded', 'processed', 'processing'])
        .orderBy('created_at', 'desc')

      this.logger.info(`📄 Encontrados ${documents.length} documentos para reprocesar`)

      let processed = 0
      let failed = 0

      for (const doc of documents) {
        try {
          this.logger.info(`\n📝 Procesando: ${doc.fileName} (${doc.documentType})`)

          // Reset status
          doc.status = 'uploaded'
          doc.extractedData = null
          doc.processingNotes = null
          doc.processedAt = null
          await doc.save()

          // Reprocesar
          await documentExtractionService.processDocument(doc)

          processed++
          this.logger.success(`✅ Procesado exitosamente`)
        } catch (error) {
          failed++
          this.logger.error(`❌ Error: ${error.message}`)
        }
      }

      this.logger.info(`\n📊 RESUMEN:`)
      this.logger.info(`  ✅ Procesados: ${processed}`)
      this.logger.info(`  ❌ Fallidos: ${failed}`)
      this.logger.info(`  📄 Total: ${documents.length}`)

      this.logger.success('\n🎉 Reprocesamiento completado!')
    } catch (error) {
      this.logger.error(`Error general: ${error.message}`)
      this.exitCode = 1
    }
  }
}

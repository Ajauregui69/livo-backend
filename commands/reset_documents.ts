import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class ResetDocuments extends BaseCommand {
  static commandName = 'documents:reset'
  static description = 'Resetear documentos fallidos para reprocesar'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('🔄 Reseteando documentos...')

    try {
      const result = await db.from('document_uploads')
        .whereIn('status', ['failed', 'processing'])
        .update({
          status: 'uploaded',
          extracted_data: null,
          processing_notes: null,
          processed_at: null
        })

      this.logger.success(`✅ ${result} documentos reseteados`)
    } catch (error) {
      this.logger.error(`❌ Error: ${error.message}`)
      this.exitCode = 1
    }
  }
}

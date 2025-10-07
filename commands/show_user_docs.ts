// @ts-nocheck
import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class ShowUserDocs extends BaseCommand {
  static commandName = 'user:show-docs'
  static description = 'Mostrar documentos de un usuario'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('📄 DOCUMENTOS POR USUARIO\n')

    try {
      const userId = '8b1fd0a6-ae2b-4512-8372-ec7e23e82829'

      const docs = await db.from('document_uploads')
        .where('user_id', userId)
        .select('*')
        .orderBy('created_at', 'desc')

      this.logger.info(`Usuario: ${userId}`)
      this.logger.info(`Total documentos: ${docs.length}\n`)

      for (const doc of docs) {
        this.logger.info(`📄 ${doc.file_name}`)
        this.logger.info(`   Tipo: ${doc.document_type}`)
        this.logger.info(`   Estado: ${doc.status}`)
        this.logger.info(`   Notas: ${doc.processing_notes || 'N/A'}`)

        if (doc.extracted_data) {
          const data = typeof doc.extracted_data === 'string'
            ? JSON.parse(doc.extracted_data)
            : doc.extracted_data

          this.logger.info(`   Campos: ${Object.keys(data).filter(k => k !== '_analysis').length}`)

          if (data._analysis) {
            this.logger.success(`   ✅ Análisis: ${data._analysis.summary}`)
            this.logger.info(`   📊 Puntos HAVI: ${data._analysis.haviPoints}`)
            if (data._analysis.details?.length > 0) {
              this.logger.info(`   Detalles:`)
              for (const detail of data._analysis.details) {
                this.logger.info(`     - ${detail}`)
              }
            }
          } else {
            this.logger.error(`   ❌ Sin análisis automático`)
          }

          // Mostrar campos extraídos
          this.logger.info(`   Datos extraídos:`)
          for (const [key, value] of Object.entries(data)) {
            if (key !== '_analysis') {
              const val = typeof value === 'object' && value !== null ? value.value : value
              this.logger.info(`     • ${key}: ${val}`)
            }
          }
        } else {
          this.logger.error(`   ❌ Sin datos extraídos`)
        }

        this.logger.info('')
      }

    } catch (error) {
      this.logger.error(`\n❌ ERROR: ${error.message}`)
      this.exitCode = 1
    }
  }
}

import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class DiagnoseSystem extends BaseCommand {
  static commandName = 'system:diagnose'
  static description = 'Diagnosticar el estado del sistema de análisis de documentos'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('🔍 DIAGNÓSTICO DEL SISTEMA\n')

    try {
      // 1. Ver documentos y su estado
      this.logger.info('📄 DOCUMENTOS:')
      const docs = await db.from('document_uploads').select('*').orderBy('created_at', 'desc').limit(3)

      for (const doc of docs) {
        this.logger.info(`\n  ID: ${doc.id}`)
        this.logger.info(`  Archivo: ${doc.file_name}`)
        this.logger.info(`  Tipo: ${doc.document_type}`)
        this.logger.info(`  Estado: ${doc.status}`)
        this.logger.info(`  Datos extraídos: ${doc.extracted_data ? 'SÍ' : 'NO'}`)

        if (doc.extracted_data) {
          const data = typeof doc.extracted_data === 'string'
            ? JSON.parse(doc.extracted_data)
            : doc.extracted_data

          this.logger.info(`  Campos extraídos: ${Object.keys(data).length}`)

          if (data._analysis) {
            this.logger.success(`  ✅ Tiene análisis automático`)
            this.logger.info(`     - Puntos HAVI: ${data._analysis.haviPoints}`)
            this.logger.info(`     - Resumen: ${data._analysis.summary}`)
          } else {
            this.logger.error(`  ❌ NO tiene análisis automático`)
          }
        }

        this.logger.info(`  Notas: ${doc.processing_notes || 'N/A'}`)
      }

      // 2. Ver reviews
      this.logger.info('\n\n📋 REVIEWS:')
      const reviews = await db.from('document_reviews')
        .select('*')
        .orderBy('created_at', 'desc')
        .limit(3)

      for (const review of reviews) {
        this.logger.info(`\n  ID Review: ${review.id}`)
        this.logger.info(`  Documento ID: ${review.document_upload_id}`)
        this.logger.info(`  Estado: ${review.status}`)
        this.logger.info(`  Confianza: ${review.confidence_score}%`)
        this.logger.info(`  Score humano: ${review.human_score || 'N/A'}`)
      }

      // 3. Ver scores crediticios
      this.logger.info('\n\n💳 SCORES CREDITICIOS:')
      const scores = await db.from('credit_scores')
        .select('*')
        .orderBy('created_at', 'desc')
        .limit(3)

      for (const score of scores) {
        this.logger.info(`\n  Usuario ID: ${score.user_id}`)
        this.logger.info(`  Score: ${score.credit_score}`)
        this.logger.info(`  Nivel de riesgo: ${score.risk_level}`)
        this.logger.info(`  Límite máximo: $${score.max_budget?.toLocaleString() || 'N/A'}`)
        this.logger.info(`  Ingreso estimado: $${score.estimated_income?.toLocaleString() || 'N/A'}`)
        this.logger.info(`  Actualizado: ${score.updated_at}`)
        this.logger.info(`  Notas: ${score.notes}`)
      }

      // 4. Ver reglas de extracción
      this.logger.info('\n\n🔧 REGLAS DE EXTRACCIÓN:')
      const rules = await db.from('extraction_rules')
        .select('*')
        .where('is_active', true)
        .limit(5)

      this.logger.info(`  Total activas: ${rules.length}`)
      for (const rule of rules) {
        this.logger.info(`  - ${rule.name} (${rule.document_type}): ${rule.success_count} éxitos, ${rule.failure_count} fallos`)
      }

    } catch (error) {
      this.logger.error(`\n❌ ERROR: ${error.message}`)
      this.exitCode = 1
    }
  }
}

import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import ExtractionRule from '#models/extraction_rule'

export default class SeedExtractionRules extends BaseCommand {
  static commandName = 'seed:extraction-rules'
  static description = 'Crea reglas de extracción iniciales para el sistema de ML'

  static options: CommandOptions = {
    startApp: true
  }

  async run() {
    this.logger.info('🌱 Creando reglas de extracción...')

    const rules = [
      // Reglas para NÓMINA (Payroll)
      {
        name: 'Extraer ingreso mensual neto de nómina',
        documentType: 'payroll' as const,
        fieldName: 'monthly_income',
        pattern: '(?:sueldo\\s*neto|salario\\s*neto|neto\\s*a\\s*pagar)[:\\s]*\\$?\\s*(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?)',
        patternType: 'regex',
        contextKeywords: ['mensual', 'neto', 'pagar'],
        priority: 10,
        description: 'Extrae el salario neto mensual de recibos de nómina'
      },
      {
        name: 'Extraer nombre del empleador',
        documentType: 'payroll' as const,
        fieldName: 'employer_name',
        pattern: '(?:empresa|empleador|razón\\s*social)[:\\s]+([A-Z][A-Za-z\\s\\.]+)',
        patternType: 'regex',
        contextKeywords: ['empresa', 'razón social'],
        priority: 8,
        description: 'Extrae el nombre de la empresa empleadora'
      },
      // Reglas para ESTADO DE CUENTA
      {
        name: 'Extraer saldo bancario disponible',
        documentType: 'bank_statement' as const,
        fieldName: 'bank_balance',
        pattern: '(?:saldo\\s*disponible|saldo\\s*actual)[:\\s]*\\$?\\s*(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?)',
        patternType: 'regex',
        contextKeywords: ['disponible', 'actual', 'saldo'],
        priority: 10,
        description: 'Extrae el saldo disponible en cuenta bancaria'
      },
      // Reglas para IDENTIFICACIÓN
      {
        name: 'Extraer CURP',
        documentType: 'id_document' as const,
        fieldName: 'curp',
        pattern: '(?:CURP)[:\\s]*([A-Z]{4}\\d{6}[HM][A-Z]{5}\\d{2})',
        patternType: 'regex',
        contextKeywords: ['CURP'],
        priority: 10,
        description: 'Extrae el CURP de identificación oficial'
      }
    ]

    let created = 0
    let skipped = 0

    for (const ruleData of rules) {
      const existing = await ExtractionRule.query()
        .where('document_type', ruleData.documentType)
        .where('field_name', ruleData.fieldName)
        .where('pattern', ruleData.pattern)
        .first()

      if (existing) {
        this.logger.warning(`⏭️  Omitiendo: ${ruleData.name} (ya existe)`)
        skipped++
        continue
      }

      await ExtractionRule.create({
        ...ruleData,
        isActive: true,
        successCount: 0,
        failureCount: 0
      })

      this.logger.success(`✅ Creada: ${ruleData.name}`)
      created++
    }

    this.logger.info(`\n✨ Resumen:`)
    this.logger.info(`   - Creadas: ${created}`)
    this.logger.info(`   - Omitidas: ${skipped}`)
    this.logger.info(`   - Total: ${rules.length}`)
  }
}
import ExtractionRule from '#models/extraction_rule'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSeeder {
  async run() {
    console.log('🔧 Eliminando reglas antiguas y creando nuevas...')

    // Eliminar reglas viejas
    await db.from('extraction_rules').delete()

    const rules = [
      // ============ BANK STATEMENT (Scotiabank format) ============
      {
        name: 'Scotiabank - Saldo Final',
        documentType: 'bank_statement',
        fieldName: 'saldo_actual',
        pattern: 'Saldo\\s+final[\\s=]*\\$\\s*([\\d,]+\\.\\d{2})',
        patternType: 'regex',
        priority: 10,
        isActive: true
      },
      {
        name: 'Scotiabank - Depósitos Totales',
        documentType: 'bank_statement',
        fieldName: 'ingreso_mensual',
        pattern: 'Dep[óo]sitos[\\s$]*([\\d,]+\\.\\d{2})',
        patternType: 'regex',
        priority: 10,
        isActive: true
      },
      {
        name: 'Scotiabank - Retiros Totales',
        documentType: 'bank_statement',
        fieldName: 'gastos_mensuales',
        pattern: 'Retiros[\\s$]*([\\d,]+\\.\\d{2})',
        patternType: 'regex',
        priority: 10,
        isActive: true
      },
      {
        name: 'Banco - Saldo Promedio',
        documentType: 'bank_statement',
        fieldName: 'saldo_promedio',
        pattern: 'Sdo\\.?\\s+Prom[\\s.]*\\$\\s*([\\d,]+\\.\\d{2})',
        patternType: 'regex',
        priority: 9,
        isActive: true
      },

      // ============ PAYROLL (Visteon format) ============
      {
        name: 'Nómina - Neto a Pagar',
        documentType: 'payroll',
        fieldName: 'salario_neto',
        pattern: 'NETO\\s+A\\s+PAGAR[\\s$]*([\\d,]+\\.\\d{2})',
        patternType: 'regex',
        priority: 10,
        isActive: true
      },
      {
        name: 'Nómina - Total Percepciones',
        documentType: 'payroll',
        fieldName: 'salario_bruto',
        pattern: 'TOTAL\\s+PERCEPCIONES[\\s$]*([\\d,]+\\.\\d{2})',
        patternType: 'regex',
        priority: 10,
        isActive: true
      },
      {
        name: 'Nómina - Sueldo Mensual',
        documentType: 'payroll',
        fieldName: 'sueldo_mensual',
        pattern: 'SUELDO\\s+MENSUAL[\\s$]*([\\d,]+\\.\\d{2})',
        patternType: 'regex',
        priority: 9,
        isActive: true
      },
      {
        name: 'Nómina - Empresa RECIBO',
        documentType: 'payroll',
        fieldName: 'empresa',
        pattern: 'RECIBO\\s+DE\\s+NOMINA\\s+([A-Z][A-Za-z\\s.]+(?:S\\.?\\s*DE\\s*R\\.?L\\.|S\\.?A\\.|S\\.?C\\.))',
        patternType: 'regex',
        priority: 10,
        isActive: true
      },

      // ============ ID DOCUMENT ============
      {
        name: 'INE - Nombre',
        documentType: 'id_document',
        fieldName: 'nombre_completo',
        pattern: 'NOMBRE[:\\s]+([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ]+(?:\\s+[A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ]+){1,3})',
        patternType: 'regex',
        priority: 10,
        isActive: true
      },
      {
        name: 'INE - CURP',
        documentType: 'id_document',
        fieldName: 'curp',
        pattern: 'CURP[:\\s]+([A-Z]{4}\\d{6}[HM][A-Z]{5}[A-Z0-9]{2})',
        patternType: 'regex',
        priority: 10,
        isActive: true
      },

      // ============ PROOF OF ADDRESS ============
      {
        name: 'CFE/Telmex - Nombre Cliente',
        documentType: 'proof_of_address',
        fieldName: 'titular',
        pattern: '(?:TITULAR|CLIENTE|NOMBRE)[:\\s]+([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ]+(?:\\s+[A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ]+){1,4})',
        patternType: 'regex',
        priority: 10,
        isActive: true
      },
      {
        name: 'Dirección - Formato México',
        documentType: 'proof_of_address',
        fieldName: 'direccion',
        pattern: '([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ]+\\s+[A-Z0-9][A-Za-z0-9\\s,.-]+(?:COL|FRACC)[A-Za-z0-9\\s,.-]+C\\.?P\\.?\\s*\\d{5})',
        patternType: 'regex',
        priority: 9,
        isActive: true
      },

      // ============ TAX RETURN ============
      {
        name: 'SAT - RFC',
        documentType: 'tax_return',
        fieldName: 'rfc',
        pattern: 'R\\.?F\\.?C\\.?[:\\s]+([A-ZÑ&]{3,4}\\d{6}[A-Z0-9]{3})',
        patternType: 'regex',
        priority: 10,
        isActive: true
      }
    ]

    for (const rule of rules) {
      await ExtractionRule.create(rule as any)
    }

    console.log(`✅ Creadas ${rules.length} reglas de extracción mejoradas`)
  }
}

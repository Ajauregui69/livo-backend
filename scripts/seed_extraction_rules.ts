/**
 * Script para crear reglas de extracción iniciales
 *
 * Ejecutar con: node ace run scripts/seed_extraction_rules.ts
 */

import ExtractionRule from '#models/extraction_rule'

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
  {
    name: 'Extraer fecha de inicio laboral',
    documentType: 'payroll' as const,
    fieldName: 'employment_start_date',
    pattern: '(?:fecha\\s*de\\s*ingreso|antigüedad\\s*desde)[:\\s]+(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})',
    patternType: 'regex',
    contextKeywords: ['ingreso', 'antigüedad'],
    priority: 7,
    description: 'Extrae la fecha de inicio en la empresa'
  },

  // Reglas para ESTADO DE CUENTA (Bank Statement)
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
  {
    name: 'Extraer saldo promedio mensual',
    documentType: 'bank_statement' as const,
    fieldName: 'average_balance',
    pattern: '(?:saldo\\s*promedio|promedio\\s*mensual)[:\\s]*\\$?\\s*(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?)',
    patternType: 'regex',
    contextKeywords: ['promedio', 'mensual'],
    priority: 9,
    description: 'Extrae el saldo promedio del mes'
  },
  {
    name: 'Contar sobregiros',
    documentType: 'bank_statement' as const,
    fieldName: 'overdraft_count',
    pattern: '(?:sobregiro|cargo\\s*por\\s*sobregiro)',
    patternType: 'regex',
    contextKeywords: ['sobregiro', 'cargo'],
    priority: 8,
    description: 'Cuenta el número de sobregiros en el estado de cuenta'
  },

  // Reglas para IDENTIFICACIÓN (ID Document)
  {
    name: 'Extraer nombre completo de INE',
    documentType: 'id_document' as const,
    fieldName: 'full_name',
    pattern: '(?:nombre)[:\\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){2,})',
    patternType: 'regex',
    contextKeywords: ['nombre'],
    priority: 10,
    description: 'Extrae el nombre completo de identificación oficial'
  },
  {
    name: 'Extraer CURP',
    documentType: 'id_document' as const,
    fieldName: 'curp',
    pattern: '(?:CURP)[:\\s]*([A-Z]{4}\\d{6}[HM][A-Z]{5}\\d{2})',
    patternType: 'regex',
    contextKeywords: ['CURP'],
    priority: 10,
    description: 'Extrae el CURP de identificación oficial'
  },
  {
    name: 'Extraer fecha de nacimiento',
    documentType: 'id_document' as const,
    fieldName: 'birth_date',
    pattern: '(?:fecha\\s*de\\s*nacimiento|nacimiento)[:\\s]+(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})',
    patternType: 'regex',
    contextKeywords: ['nacimiento'],
    priority: 9,
    description: 'Extrae la fecha de nacimiento'
  },

  // Reglas para COMPROBANTE DE DOMICILIO
  {
    name: 'Extraer dirección completa',
    documentType: 'proof_of_address' as const,
    fieldName: 'address',
    pattern: '(?:dirección|domicilio)[:\\s]+([A-Za-z0-9\\s,\\.#-]+)',
    patternType: 'regex',
    contextKeywords: ['dirección', 'domicilio'],
    priority: 10,
    description: 'Extrae la dirección del comprobante de domicilio'
  },

  // Reglas para DECLARACIÓN FISCAL
  {
    name: 'Extraer ingreso anual total',
    documentType: 'tax_return' as const,
    fieldName: 'annual_income',
    pattern: '(?:ingreso\\s*total\\s*anual|ingresos\\s*anuales)[:\\s]*\\$?\\s*(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?)',
    patternType: 'regex',
    contextKeywords: ['anual', 'total', 'ingresos'],
    priority: 10,
    description: 'Extrae el ingreso anual de la declaración fiscal'
  },
  {
    name: 'Extraer RFC',
    documentType: 'tax_return' as const,
    fieldName: 'rfc',
    pattern: '(?:RFC)[:\\s]*([A-Z&Ñ]{3,4}\\d{6}[A-Z0-9]{3})',
    patternType: 'regex',
    contextKeywords: ['RFC'],
    priority: 10,
    description: 'Extrae el RFC de la declaración fiscal'
  }
]

export default async function seedExtractionRules() {
  console.log('🌱 Creando reglas de extracción...')

  let created = 0
  let skipped = 0

  for (const ruleData of rules) {
    // Verificar si ya existe
    const existing = await ExtractionRule.query()
      .where('document_type', ruleData.documentType)
      .where('field_name', ruleData.fieldName)
      .where('pattern', ruleData.pattern)
      .first()

    if (existing) {
      console.log(`⏭️  Omitiendo: ${ruleData.name} (ya existe)`)
      skipped++
      continue
    }

    await ExtractionRule.create({
      ...ruleData,
      isActive: true,
      successCount: 0,
      failureCount: 0
    })

    console.log(`✅ Creada: ${ruleData.name}`)
    created++
  }

  console.log(`\n✨ Resumen:`)
  console.log(`   - Creadas: ${created}`)
  console.log(`   - Omitidas: ${skipped}`)
  console.log(`   - Total: ${rules.length}`)
}

// Si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seedExtractionRules()
    .then(() => {
      console.log('\n✅ Script completado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      process.exit(1)
    })
}

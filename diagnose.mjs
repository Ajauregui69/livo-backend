import db from '@adonisjs/lucid/services/db'

console.log('🔍 DIAGNÓSTICO DEL SISTEMA\n')

try {
  // 1. Ver documentos y su estado
  console.log('📄 DOCUMENTOS:')
  const docs = await db.from('document_uploads').select('*').orderBy('created_at', 'desc').limit(3)

  for (const doc of docs) {
    console.log(`\n  ID: ${doc.id}`)
    console.log(`  Archivo: ${doc.file_name}`)
    console.log(`  Tipo: ${doc.document_type}`)
    console.log(`  Estado: ${doc.status}`)
    console.log(`  Datos extraídos: ${doc.extracted_data ? 'SÍ' : 'NO'}`)

    if (doc.extracted_data) {
      const data = typeof doc.extracted_data === 'string'
        ? JSON.parse(doc.extracted_data)
        : doc.extracted_data

      console.log(`  Campos extraídos: ${Object.keys(data).length}`)

      if (data._analysis) {
        console.log(`  ✅ Tiene análisis automático`)
        console.log(`     - Puntos HAVI: ${data._analysis.haviPoints}`)
        console.log(`     - Resumen: ${data._analysis.summary}`)
      } else {
        console.log(`  ❌ NO tiene análisis automático`)
      }
    }

    console.log(`  Notas: ${doc.processing_notes || 'N/A'}`)
  }

  // 2. Ver reviews
  console.log('\n\n📋 REVIEWS:')
  const reviews = await db.from('document_reviews')
    .select('*')
    .orderBy('created_at', 'desc')
    .limit(3)

  for (const review of reviews) {
    console.log(`\n  ID Review: ${review.id}`)
    console.log(`  Documento ID: ${review.document_upload_id}`)
    console.log(`  Estado: ${review.status}`)
    console.log(`  Confianza: ${review.confidence_score}%`)
    console.log(`  Score humano: ${review.human_score || 'N/A'}`)
  }

  // 3. Ver scores crediticios
  console.log('\n\n💳 SCORES CREDITICIOS:')
  const scores = await db.from('credit_scores')
    .select('*')
    .orderBy('created_at', 'desc')
    .limit(3)

  for (const score of scores) {
    console.log(`\n  Usuario ID: ${score.user_id}`)
    console.log(`  Score: ${score.credit_score}`)
    console.log(`  Nivel de riesgo: ${score.risk_level}`)
    console.log(`  Límite máximo: $${score.max_budget?.toLocaleString() || 'N/A'}`)
    console.log(`  Ingreso estimado: $${score.estimated_income?.toLocaleString() || 'N/A'}`)
    console.log(`  Actualizado: ${score.updated_at}`)
    console.log(`  Notas: ${score.notes}`)
  }

  // 4. Ver reglas de extracción
  console.log('\n\n🔧 REGLAS DE EXTRACCIÓN:')
  const rules = await db.from('extraction_rules')
    .select('*')
    .where('is_active', true)
    .limit(5)

  console.log(`  Total activas: ${rules.length}`)
  for (const rule of rules) {
    console.log(`  - ${rule.name} (${rule.document_type}): ${rule.success_count} éxitos, ${rule.failure_count} fallos`)
  }

  process.exit(0)
} catch (error) {
  console.error('\n❌ ERROR:', error.message)
  process.exit(1)
}

import Database from '@adonisjs/lucid/services/db'

console.log('Checking extraction rules...')

try {
  const rules = await Database.from('extraction_rules').select('*').limit(10)
  console.log('Extraction rules:', rules.length)
  if (rules.length > 0) {
    console.log('First rule:', JSON.stringify(rules[0], null, 2))
  }

  const docs = await Database.from('document_uploads').select('*').orderBy('created_at', 'desc').limit(3)
  console.log('\nRecent documents:', docs.length)
  docs.forEach(doc => {
    console.log(`- ${doc.file_name}: status=${doc.status}, extracted_data=${doc.extracted_data ? 'YES' : 'NO'}`)
  })

  process.exit(0)
} catch (error) {
  console.error('Error:', error)
  process.exit(1)
}

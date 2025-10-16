// Test MoonshotAI connection via OpenRouter
async function testConnection() {
  const apiKey = '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'
  const apiBase = 'https://openrouter.ai/api/v1'
  const model = 'moonshotai/kimi-k2-0905'

  console.log('🔍 Testing connection to MoonshotAI via OpenRouter...')
  console.log('API Base:', apiBase)
  console.log('Model:', model)
  console.log('')

  try {
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://livo.app',
        'X-Title': 'LIVO Test'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: 'Di "Hola" en español'
          }
        ],
        temperature: 0.6,
        max_tokens: 100
      })
    })

    console.log('📡 Response status:', response.status, response.statusText)
    console.log('')

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Error:', JSON.stringify(data, null, 2))
      return
    }

    console.log('✅ Success!')
    console.log('Response:', JSON.stringify(data, null, 2))

    if (data.choices && data.choices.length > 0) {
      console.log('')
      console.log('🤖 AI Response:', data.choices[0].message.content)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testConnection()

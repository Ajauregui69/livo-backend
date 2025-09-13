// Script de prueba para crear un agente y probar login
import { BaseModel } from '@adonisjs/lucid/orm'
import Database from '@adonisjs/lucid/services/db'
import Agent from '#models/agent'
import hash from '@adonisjs/core/services/hash'
import { randomUUID } from 'node:crypto'

// Configurar la base de datos
// Este es un script de prueba - ejecutar con node ace

async function testAgentCreation() {
  try {
    console.log('🧪 Starting agent creation test...')
    
    // Datos de prueba
    const testAgentData = {
      id: randomUUID(),
      name: 'Test Agent',
      email: 'test.agent@example.com',
      password: 'test123', // Contraseña en texto plano
      agencyId: 'some-agency-id', // Debes poner el ID de una agencia real
      role: 'agent',
      isActive: true
    }
    
    console.log('📝 Creating agent with data:', {
      ...testAgentData,
      password: '***HIDDEN***'
    })
    
    // Hashear la contraseña manualmente
    const hashedPassword = await hash.make(testAgentData.password)
    console.log('🔐 Password hashed manually')
    
    // Crear el agente
    const agent = await Agent.create({
      ...testAgentData,
      password: hashedPassword
    })
    
    console.log('✅ Agent created:', {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      hasPassword: !!agent.password
    })
    
    // Probar verificación de contraseña
    const isValid = await agent.verifyPassword('test123')
    console.log('🔍 Password verification test:', isValid ? 'PASSED' : 'FAILED')
    
    if (!isValid) {
      console.log('❌ Password verification failed - checking details...')
      console.log('Stored password hash:', agent.password)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

export default testAgentCreation
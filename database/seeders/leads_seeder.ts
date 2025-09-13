import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import CreditScore from '#models/credit_score'
import hash from '@adonisjs/core/services/hash'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    // Don't hash manually - let AdonisJS User model handle it
    const plainPassword = 'password123'
    
    // Crear leads con diferentes perfiles crediticios
    const leadsData = [
      {
        // Lead Premium - Score Alto
        user: {
          firstName: 'Carlos',
          lastName: 'Mendoza',
          email: 'carlos.mendoza@test.com',
          password: plainPassword,
          phone: '+52 55 1234-5678',
          role: 'comprador' as const,
          status: 'active' as const,
        },
        creditScore: {
          creditScore: 745,
          estimatedIncome: 85000,
          riskLevel: 'low' as const,
          bureauReportId: 'BC-745-001',
          notes: 'Historial crediticio excelente, sin atrasos en pagos'
        }
      },
      {
        // Lead Bueno - Score Medio Alto
        user: {
          firstName: 'María',
          lastName: 'González',
          email: 'maria.gonzalez@test.com',
          password: plainPassword,
          phone: '+52 55 2345-6789',
          role: 'comprador' as const,
          status: 'active' as const,
        },
        creditScore: {
          creditScore: 680,
          estimatedIncome: 65000,
          riskLevel: 'low' as const,
          bureauReportId: 'BC-680-002',
          notes: 'Buen historial, un atraso menor hace 2 años'
        }
      },
      {
        // Lead Promedio - Score Medio
        user: {
          firstName: 'José',
          lastName: 'Ramírez',
          email: 'jose.ramirez@test.com',
          password: plainPassword,
          phone: '+52 55 3456-7890',
          role: 'comprador' as const,
          status: 'active' as const,
        },
        creditScore: {
          creditScore: 620,
          estimatedIncome: 45000,
          riskLevel: 'medium' as const,
          bureauReportId: 'BC-620-003',
          notes: 'Historial regular, algunos atrasos menores'
        }
      },
      {
        // Lead Emergente - Score Medio Bajo
        user: {
          firstName: 'Ana',
          lastName: 'López',
          email: 'ana.lopez@test.com',
          password: plainPassword,
          phone: '+52 55 4567-8901',
          role: 'comprador' as const,
          status: 'active' as const,
        },
        creditScore: {
          creditScore: 580,
          estimatedIncome: 35000,
          riskLevel: 'medium' as const,
          bureauReportId: 'BC-580-004',
          notes: 'Perfil joven, historial crediticio limitado pero positivo'
        }
      },
      {
        // Lead de Recuperación - Score Bajo
        user: {
          firstName: 'Roberto',
          lastName: 'Hernández',
          email: 'roberto.hernandez@test.com',
          password: plainPassword,
          phone: '+52 55 5678-9012',
          role: 'comprador' as const,
          status: 'active' as const,
        },
        creditScore: {
          creditScore: 520,
          estimatedIncome: 28000,
          riskLevel: 'high' as const,
          bureauReportId: 'BC-520-005',
          notes: 'Historial con dificultades pasadas, en proceso de recuperación'
        }
      },
      {
        // Lead Primera Vivienda - Score Bajo pero estable
        user: {
          firstName: 'Sofía',
          lastName: 'Morales',
          email: 'sofia.morales@test.com',
          password: plainPassword,
          phone: '+52 55 6789-0123',
          role: 'comprador' as const,
          status: 'active' as const,
        },
        creditScore: {
          creditScore: 485,
          estimatedIncome: 32000,
          riskLevel: 'high' as const,
          bureauReportId: 'BC-485-006',
          notes: 'Sin historial extenso, empleada estable, primera vez comprando'
        }
      },
      {
        // Lead Premium 2 - Score Muy Alto
        user: {
          firstName: 'Eduardo',
          lastName: 'Castillo',
          email: 'eduardo.castillo@test.com',
          password: plainPassword,
          phone: '+52 55 7890-1234',
          role: 'comprador' as const,
          status: 'active' as const,
        },
        creditScore: {
          creditScore: 720,
          estimatedIncome: 120000,
          riskLevel: 'low' as const,
          bureauReportId: 'BC-720-007',
          notes: 'Empresario exitoso, excelente capacidad de pago'
        }
      },
      {
        // Lead Joven Profesionista - Score Medio
        user: {
          firstName: 'Paola',
          lastName: 'Ruiz',
          email: 'paola.ruiz@test.com',
          password: plainPassword,
          phone: '+52 55 8901-2345',
          role: 'comprador' as const,
          status: 'active' as const,
        },
        creditScore: {
          creditScore: 650,
          estimatedIncome: 55000,
          riskLevel: 'medium' as const,
          bureauReportId: 'BC-650-008',
          notes: 'Profesionista joven, ingreso creciente, buen potencial'
        }
      }
    ]

    // Crear usuarios y sus scores crediticios
    for (const leadData of leadsData) {
      // Verificar si el usuario ya existe
      const existingUser = await User.findBy('email', leadData.user.email)
      
      let user: User
      if (existingUser) {
        console.log(`Usuario ${leadData.user.email} ya existe, actualizando...`)
        user = existingUser
        // Actualizar datos del usuario existente
        user.merge(leadData.user)
        await user.save()
      } else {
        // Crear nuevo usuario
        user = await User.create(leadData.user)
        console.log(`Usuario ${leadData.user.email} creado`)
      }
      
      // Verificar si ya tiene score crediticio activo
      const existingScore = await user.getCurrentCreditScore()
      
      if (existingScore) {
        console.log(`Score crediticio para ${user.email} ya existe, actualizando...`)
        // Actualizar score existente
        existingScore.merge({
          ...leadData.creditScore,
          maxBudget: CreditScore.calculateMaxBudget(
            leadData.creditScore.creditScore, 
            leadData.creditScore.estimatedIncome
          ),
          checkedAt: DateTime.now(),
          expiresAt: DateTime.now().plus({ months: 6 }),
        })
        await existingScore.save()
      } else {
        // Calcular presupuesto máximo basado en score e ingreso
        const maxBudget = CreditScore.calculateMaxBudget(
          leadData.creditScore.creditScore, 
          leadData.creditScore.estimatedIncome
        )
        
        // Crear nuevo score crediticio
        await CreditScore.create({
          userId: user.id,
          ...leadData.creditScore,
          maxBudget,
          isActive: true,
          checkedAt: DateTime.now(),
          expiresAt: DateTime.now().plus({ months: 6 }), // Expire en 6 meses
        })
        console.log(`Score crediticio para ${user.email} creado`)
      }
    }

    console.log('✅ Leads con scores crediticios creados exitosamente')
  }
}
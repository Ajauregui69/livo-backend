import type { HttpContext } from '@adonisjs/core/http'
import CreditAnalysis from '#models/credit_analysis'
import DocumentUpload from '#models/document_upload'
// import AiConversation from '#models/ai_conversation'
import { DateTime } from 'luxon'

export default class AiAnalysisController {
  /**
   * Get user's credit analysis
   */
  async getUserAnalysis({ auth, response }: HttpContext) {
    const user = auth.user!
    
    try {
      const analysis = await CreditAnalysis.query()
        .where('user_id', user.id)
        .where('status', 'completed')
        .where((query) => {
          query.whereNull('expires_at').orWhere('expires_at', '>', DateTime.now().toSQL())
        })
        .orderBy('created_at', 'desc')
        .first()

      if (!analysis) {
        return response.json({
          hasAnalysis: false,
          message: 'No tienes un análisis de crédito disponible'
        })
      }

      return response.json({
        hasAnalysis: true,
        analysis: {
          id: analysis.id,
          internalScore: analysis.internalScore,
          scoreDescription: analysis.scoreDescription,
          riskLevel: analysis.riskLevel,
          riskLevelDescription: analysis.riskLevelDescription,
          maxLoanAmount: analysis.maxLoanAmount,
          suggestedDownPayment: analysis.suggestedDownPayment,
          recommendations: analysis.recommendations,
          processedAt: analysis.processedAt,
          expiresAt: analysis.expiresAt,
          isExpired: analysis.isExpired
        }
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al obtener el análisis crediticio',
        error: error.message
      })
    }
  }

  /**
   * Request new credit analysis
   */
  async requestAnalysis({ auth, response }: HttpContext) {
    const user = auth.user!
    
    try {
      // Check if user has required documents
      const requiredDocuments = ['bank_statement', 'payroll', 'id_document']
      const uploadedDocs = await DocumentUpload.query()
        .where('user_id', user.id)
        .where('status', 'processed')
        .whereIn('document_type', requiredDocuments)

      const uploadedTypes = uploadedDocs.map(doc => doc.documentType)
      const missingDocs = requiredDocuments.filter(type => !uploadedTypes.includes(type as any))

      if (missingDocs.length > 0) {
        return response.status(400).json({
          message: 'Faltan documentos requeridos para el análisis',
          missingDocuments: missingDocs,
          missingDocumentsDescription: missingDocs.map(type => {
            const descriptions = {
              'bank_statement': 'Estado de Cuenta Bancario',
              'payroll': 'Recibo de Nómina',
              'id_document': 'Identificación Oficial'
            }
            return descriptions[type as keyof typeof descriptions]
          })
        })
      }

      // Check if there's already a pending/processing analysis
      const existingAnalysis = await CreditAnalysis.query()
        .where('user_id', user.id)
        .whereIn('status', ['pending', 'processing'])
        .first()

      if (existingAnalysis) {
        return response.status(400).json({
          message: 'Ya tienes un análisis en proceso',
          analysisId: existingAnalysis.id,
          status: existingAnalysis.status
        })
      }

      // Create new analysis request
      const analysis = await CreditAnalysis.create({
        userId: user.id,
        status: 'pending',
        expiresAt: DateTime.now().plus({ days: 30 }) // Válido por 30 días
      })

      // TODO: Queue job to process analysis with AI service
      // This will be implemented when we create the Python service
      
      return response.status(201).json({
        message: 'Solicitud de análisis creada exitosamente',
        analysisId: analysis.id,
        status: analysis.status,
        estimatedCompletionTime: '5-10 minutos'
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al solicitar análisis crediticio',
        error: error.message
      })
    }
  }

  /**
   * Get analysis status
   */
  async getAnalysisStatus({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { analysisId } = params
    
    try {
      const analysis = await CreditAnalysis.query()
        .where('id', analysisId)
        .where('user_id', user.id)
        .first()

      if (!analysis) {
        return response.status(404).json({
          message: 'Análisis no encontrado'
        })
      }

      return response.json({
        id: analysis.id,
        status: analysis.status,
        processedAt: analysis.processedAt,
        createdAt: analysis.createdAt
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al obtener el estado del análisis',
        error: error.message
      })
    }
  }

  /**
   * Get user's documents summary
   */
  async getDocumentsSummary({ auth, response }: HttpContext) {
    const user = auth.user!
    
    try {
      const documents = await DocumentUpload.query()
        .where('user_id', user.id)
        .orderBy('created_at', 'desc')

      const requiredDocuments = [
        { type: 'bank_statement', name: 'Estado de Cuenta Bancario', required: true },
        { type: 'payroll', name: 'Recibo de Nómina', required: true },
        { type: 'id_document', name: 'Identificación Oficial', required: true },
        { type: 'tax_return', name: 'Declaración Fiscal', required: false },
        { type: 'proof_of_address', name: 'Comprobante de Domicilio', required: false },
        { type: 'employment_letter', name: 'Carta Laboral', required: false }
      ]

      const documentsSummary = requiredDocuments.map(reqDoc => {
        const uploadedDoc = documents.find(doc => doc.documentType === reqDoc.type)
        return {
          type: reqDoc.type,
          name: reqDoc.name,
          required: reqDoc.required,
          uploaded: !!uploadedDoc,
          status: uploadedDoc?.status || null,
          uploadedAt: uploadedDoc?.createdAt || null,
          fileName: uploadedDoc?.fileName || null,
          id: uploadedDoc?.id || null
        }
      })

      const totalRequired = requiredDocuments.filter(doc => doc.required).length
      const completedRequired = documentsSummary.filter(doc => doc.required && doc.uploaded && doc.status === 'processed').length
      const completionPercentage = Math.round((completedRequired / totalRequired) * 100)

      return response.json({
        documents: documentsSummary,
        summary: {
          totalRequired,
          completedRequired,
          completionPercentage,
          canRequestAnalysis: completedRequired === totalRequired
        }
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al obtener resumen de documentos',
        error: error.message
      })
    }
  }
}
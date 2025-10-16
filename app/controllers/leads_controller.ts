import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import CreditScore from '#models/credit_score'
import DocumentUpload from '#models/document_upload'
import db from '@adonisjs/lucid/services/db'

export default class LeadsController {
  /**
   * Get all buyer leads with their credit information
   */
  async getBuyerLeads({ auth, request, response }: HttpContext) {
    try {
      const authUser = auth.user!

      // Only admin and agency_admin can access leads
      if (!['admin', 'agency_admin'].includes(authUser.role)) {
        return response.status(403).json({
          message: 'No tienes permisos para acceder a los leads'
        })
      }

      // Get pagination params
      const page = request.input('page', 1)
      const perPage = request.input('perPage', 10)

      // Get all buyers (compradores) with their credit scores and document count
      const buyersQuery = User.query()
        .where('role', 'comprador')
        .preload('creditScore', (query) => {
          query.where('is_active', true)
        })
        .orderBy('created_at', 'desc')

      const buyersPaginated = await buyersQuery.paginate(page, perPage)
      const buyers = buyersPaginated.all()

      // Get document counts and latest credit scores for each buyer
      const buyersWithData = await Promise.all(
        buyers.map(async (buyer) => {
          // Count documents by status
          const documentStats = await DocumentUpload.query()
            .where('user_id', buyer.id)
            .select(
              db.raw('COUNT(*) as total'),
              db.raw('COUNT(CASE WHEN status = \'processed\' THEN 1 END) as processed'),
              db.raw('COUNT(CASE WHEN status = \'uploaded\' THEN 1 END) as uploaded'),
              db.raw('COUNT(CASE WHEN status = \'failed\' THEN 1 END) as failed')
            )
            .first()

          // Calculate credit score in real-time (same as ML dashboard)
          let latestCreditScore = null
          let calculatedScore = null
          try {
            const { creditScoringService } = await import('#services/credit_scoring_service')
            const scoreResult = await creditScoringService.calculateCreditScore(buyer.id)
            calculatedScore = scoreResult.internalScore
            latestCreditScore = {
              creditScore: scoreResult.internalScore,
              riskLevel: scoreResult.riskLevel,
              maxLoanAmount: scoreResult.maxLoanAmount
            }
          } catch (error) {
            // Si no se puede calcular en tiempo real, usar el guardado en DB
            const dbScore = await CreditScore.query()
              .where('user_id', buyer.id)
              .where('is_active', true)
              .orderBy('created_at', 'desc')
              .first()

            if (dbScore) {
              latestCreditScore = dbScore
              calculatedScore = dbScore.creditScore
            }
          }

          // Calculate prequalified amount based on monthly income
          // Formula: Ingreso × 0.35 × 240 meses × 0.9
          let prequalifiedAmount = null
          if (buyer.monthlyIncome && buyer.monthlyIncome > 0) {
            prequalifiedAmount = Math.round(buyer.monthlyIncome * 0.35 * 240 * 0.9)
          }

          // Determine lead status based on data completeness
          let leadStatus = 'Nuevo'
          if (latestCreditScore && latestCreditScore.creditScore >= 700) {
            leadStatus = 'Calificado'
          } else if (documentStats && Number(documentStats.$extras.total) > 0) {
            if (Number(documentStats.$extras.processed) > 0) {
              leadStatus = 'En proceso'
            } else {
              leadStatus = 'Contactado'
            }
          }

          // Calculate conversion probability based on credit score and documents
          let probability = 50 // Base probability
          if (latestCreditScore) {
            if (latestCreditScore.creditScore >= 750) {
              probability = 90
            } else if (latestCreditScore.creditScore >= 700) {
              probability = 80
            } else if (latestCreditScore.creditScore >= 650) {
              probability = 70
            } else if (latestCreditScore.creditScore >= 600) {
              probability = 60
            }
          }

          // Adjust probability based on document completeness
          const totalDocs = Number(documentStats?.$extras.total || 0)
          if (totalDocs >= 4) probability += 10
          if (totalDocs >= 6) probability += 5

          // Cap probability at 95
          probability = Math.min(probability, 95)

          return {
            id: buyer.id,
            name: `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() || buyer.email,
            email: buyer.email,
            phone: buyer.phone || 'N/A',
            type: 'LIVO Directo', // Default type, could be dynamic based on user preferences
            creditScore: calculatedScore,
            monthlyIncome: buyer.monthlyIncome
              ? `$${buyer.monthlyIncome.toLocaleString('es-MX')}`
              : 'N/A',
            monthlyIncomeRaw: buyer.monthlyIncome || 0,
            prequalifiedAmount: prequalifiedAmount
              ? `$${prequalifiedAmount.toLocaleString('es-MX')}`
              : 'N/A',
            prequalifiedAmountRaw: prequalifiedAmount,
            propertyInterest: 'Sin especificar', // Could be enhanced with user preferences
            status: leadStatus,
            probability: probability,
            date: buyer.createdAt.toFormat('yyyy-MM-dd'),
            documents: {
              total: Number(documentStats?.$extras.total || 0),
              processed: Number(documentStats?.$extras.processed || 0),
              uploaded: Number(documentStats?.$extras.uploaded || 0),
              failed: Number(documentStats?.$extras.failed || 0)
            },
            employment: buyer.employment || 'N/A',
            workYears: buyer.workYears || 0,
            location: `${buyer.city || ''}, ${buyer.state || ''}`.trim() || 'N/A',
            riskLevel: latestCreditScore?.riskLevel || 'unknown'
          }
        })
      )

      // Calculate statistics from all buyers (not just current page)
      const allBuyersCount = await User.query().where('role', 'comprador').count('* as total')
      const totalLeads = Number(allBuyersCount[0].$extras.total)

      const livoDirecto = buyersWithData.filter(b => b.type === 'LIVO Directo').length
      const livoRenta = buyersWithData.filter(b => b.type === 'LIVO Renta').length

      // Count prequalified from all buyers
      const prequalifiedCount = await User.query()
        .where('role', 'comprador')
        .whereHas('creditScore', (query) => {
          query.where('is_active', true).where('credit_score', '>=', 600)
        })
        .count('* as total')
      const prequalified = Number(prequalifiedCount[0].$extras.total)

      return response.json({
        leads: buyersWithData,
        pagination: {
          total: buyersPaginated.total,
          perPage: buyersPaginated.perPage,
          currentPage: buyersPaginated.currentPage,
          lastPage: buyersPaginated.lastPage,
          hasMorePages: buyersPaginated.hasMorePages,
          hasPages: buyersPaginated.hasPages
        },
        stats: {
          totalLeads,
          livoDirecto: totalLeads, // For now all are LIVO Directo
          livoRenta: 0,
          prequalified
        }
      })
    } catch (error) {
      console.error('Error getting buyer leads:', error)
      return response.status(500).json({
        message: 'Error al obtener los leads',
        error: error.message
      })
    }
  }

  /**
   * Get lead details by ID
   */
  async getLeadDetails({ auth, params, response }: HttpContext) {
    try {
      const authUser = auth.user!
      const { leadId } = params

      // Only admin and agency_admin can access leads
      if (!['admin', 'agency_admin'].includes(authUser.role)) {
        return response.status(403).json({
          message: 'No tienes permisos para acceder a los leads'
        })
      }

      const buyer = await User.query()
        .where('id', leadId)
        .where('role', 'comprador')
        .preload('creditScore', (query) => {
          query.where('is_active', true)
        })
        .preload('documentUploads')
        .first()

      if (!buyer) {
        return response.status(404).json({
          message: 'Lead no encontrado'
        })
      }

      const latestCreditScore = await CreditScore.query()
        .where('user_id', buyer.id)
        .where('is_active', true)
        .orderBy('created_at', 'desc')
        .first()

      return response.json({
        buyer: {
          id: buyer.id,
          firstName: buyer.firstName,
          lastName: buyer.lastName,
          email: buyer.email,
          phone: buyer.phone,
          monthlyIncome: buyer.monthlyIncome,
          employment: buyer.employment,
          workYears: buyer.workYears,
          address: buyer.address,
          city: buyer.city,
          state: buyer.state,
          zipCode: buyer.zipCode,
          createdAt: buyer.createdAt
        },
        creditScore: latestCreditScore ? {
          internalScore: latestCreditScore.internalScore,
          riskLevel: latestCreditScore.riskLevel,
          maxLoanAmount: latestCreditScore.maxLoanAmount,
          suggestedDownPayment: latestCreditScore.suggestedDownPayment,
          createdAt: latestCreditScore.createdAt
        } : null,
        documents: buyer.documentUploads.map(doc => ({
          id: doc.id,
          fileName: doc.fileName,
          documentType: doc.documentType,
          status: doc.status,
          createdAt: doc.createdAt
        }))
      })
    } catch (error) {
      console.error('Error getting lead details:', error)
      return response.status(500).json({
        message: 'Error al obtener detalles del lead',
        error: error.message
      })
    }
  }
}

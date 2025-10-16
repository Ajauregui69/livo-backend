// @ts-nocheck
import type { HttpContext } from '@adonisjs/core/http'
import DocumentReview from '#models/document_review'
import DocumentUpload from '#models/document_upload'
import DocumentField from '#models/document_field'
import { DateTime } from 'luxon'
import vine from '@vinejs/vine'

const updateReviewValidator = vine.compile(
  vine.object({
    reviewedData: vine.object({}).allowUnknownProperties(),
    fieldCorrections: vine.object({}).allowUnknownProperties().optional(),
    status: vine.enum(['in_review', 'completed', 'skipped'])
  })
)

export default class DocumentReviewController {
  /**
   * Obtener todos los documentos pendientes de revisión
   */
  async getPendingReviews({ auth, response, request }: HttpContext) {
    const user = auth.user!

    // Solo admin y agency_admin pueden revisar
    if (!['admin', 'agency_admin'].includes(user.role)) {
      return response.status(403).json({
        message: 'No tienes permisos para revisar documentos'
      })
    }

    try {
      const page = request.input('page', 1)
      const limit = request.input('limit', 20)
      const status = request.input('status', 'pending')

      const reviews = await DocumentReview.query()
        .where('status', status)
        .preload('documentUpload', (query) => {
          query.preload('user')
        })
        .preload('fields')
        .orderBy('created_at', 'asc')
        .paginate(page, limit)

      const reviewsData = reviews.all().map(review => ({
        id: review.id,
        status: review.status,
        statusDescription: review.statusDescription,
        confidenceScore: review.confidenceScore,
        extractionNotes: review.extractionNotes,
        autoExtractedData: review.autoExtractedData,
        needsReview: review.needsReview,
        createdAt: review.createdAt,
        assignedAt: review.assignedAt,
        document: {
          id: review.documentUpload.id,
          fileName: review.documentUpload.fileName,
          documentType: review.documentUpload.documentType,
          documentTypeDescription: review.documentUpload.documentTypeDescription,
          uploadedAt: review.documentUpload.createdAt,
          user: {
            id: review.documentUpload.user.id,
            fullName: review.documentUpload.user.fullName,
            email: review.documentUpload.user.email
          }
        },
        fields: review.fields.map(field => ({
          id: field.id,
          fieldName: field.fieldName,
          fieldNameDescription: field.fieldNameDescription,
          fieldType: field.fieldType,
          extractedValue: field.extractedValue,
          reviewedValue: field.reviewedValue,
          confidence: field.confidence,
          wasCorrected: field.wasCorrected
        }))
      }))

      return response.json({
        reviews: reviewsData,
        meta: reviews.getMeta()
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al obtener revisiones pendientes',
        error: error.message
      })
    }
  }

  /**
   * Obtener una revisión específica con el documento
   */
  async getReview({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { reviewId } = params

    if (!['admin', 'agency_admin'].includes(user.role)) {
      return response.status(403).json({
        message: 'No tienes permisos para revisar documentos'
      })
    }

    try {
      const review = await DocumentReview.query()
        .where('id', reviewId)
        .preload('documentUpload', (query) => {
          query.preload('user')
        })
        .preload('fields')
        .firstOrFail()

      // Generar URL firmada para ver el documento
      const { s3Service } = await import('#services/s3_service')
      const documentUrl = await s3Service.getSignedUrl(review.documentUpload.filePath, 3600)

      return response.json({
        id: review.id,
        status: review.status,
        statusDescription: review.statusDescription,
        confidenceScore: review.confidenceScore,
        extractionNotes: review.extractionNotes,
        autoExtractedData: review.autoExtractedData,
        reviewedData: review.reviewedData,
        fieldCorrections: review.fieldCorrections,
        needsReview: review.needsReview,
        createdAt: review.createdAt,
        assignedAt: review.assignedAt,
        reviewedAt: review.reviewedAt,
        document: {
          id: review.documentUpload.id,
          fileName: review.documentUpload.fileName,
          documentType: review.documentUpload.documentType,
          documentTypeDescription: review.documentUpload.documentTypeDescription,
          uploadedAt: review.documentUpload.createdAt,
          viewUrl: documentUrl,
          user: {
            id: review.documentUpload.user.id,
            fullName: review.documentUpload.user.fullName,
            email: review.documentUpload.user.email,
            phone: review.documentUpload.user.phone
          }
        },
        fields: review.fields.map(field => ({
          id: field.id,
          fieldName: field.fieldName,
          fieldNameDescription: field.fieldNameDescription,
          fieldType: field.fieldType,
          extractedValue: field.extractedValue,
          reviewedValue: field.reviewedValue,
          confidence: field.confidence,
          extractionMethod: field.extractionMethod,
          wasCorrected: field.wasCorrected,
          isHighConfidence: field.isHighConfidence,
          isMediumConfidence: field.isMediumConfidence,
          isLowConfidence: field.isLowConfidence
        }))
      })
    } catch (error) {
      return response.status(404).json({
        message: 'Revisión no encontrada',
        error: error.message
      })
    }
  }

  /**
   * Asignar una revisión al usuario actual
   */
  async assignReview({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { reviewId } = params

    if (!['admin', 'agency_admin'].includes(user.role)) {
      return response.status(403).json({
        message: 'No tienes permisos para revisar documentos'
      })
    }

    try {
      const review = await DocumentReview.findOrFail(reviewId)

      if (review.status !== 'pending') {
        return response.status(400).json({
          message: 'Esta revisión ya está asignada o completada'
        })
      }

      review.reviewerUserId = user.id
      review.status = 'in_review'
      review.assignedAt = DateTime.now()
      await review.save()

      return response.json({
        message: 'Revisión asignada exitosamente',
        review: {
          id: review.id,
          status: review.status,
          assignedAt: review.assignedAt
        }
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al asignar revisión',
        error: error.message
      })
    }
  }

  /**
   * Actualizar una revisión con datos corregidos
   */
  async updateReview({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const { reviewId } = params

    if (!['admin', 'agency_admin'].includes(user.role)) {
      return response.status(403).json({
        message: 'No tienes permisos para revisar documentos'
      })
    }

    try {
      const payload = await request.validateUsing(updateReviewValidator)
      const review = await DocumentReview.query()
        .where('id', reviewId)
        .preload('documentUpload')
        .preload('fields')
        .firstOrFail()

      // Actualizar campos individuales si hay correcciones
      if (payload.fieldCorrections) {
        for (const [fieldName, correctedValue] of Object.entries(payload.fieldCorrections)) {
          const field = review.fields.find(f => f.fieldName === fieldName)

          if (field) {
            field.reviewedValue = String(correctedValue)
            field.wasCorrected = field.extractedValue !== correctedValue
            await field.save()
          } else {
            // Crear nuevo campo si no existía
            await DocumentField.create({
              documentUploadId: review.documentUploadId,
              documentReviewId: review.id,
              fieldName: fieldName,
              fieldType: 'text',
              reviewedValue: String(correctedValue),
              extractionMethod: 'manual',
              wasCorrected: true,
              confidence: 100
            })
          }
        }
      }

      // Actualizar revisión
      review.reviewedData = payload.reviewedData
      review.fieldCorrections = payload.fieldCorrections || {}
      review.status = payload.status
      review.reviewerUserId = user.id

      if (payload.status === 'completed') {
        review.reviewedAt = DateTime.now()

        // Actualizar documento como procesado
        const document = review.documentUpload
        document.status = 'processed'
        document.extractedData = payload.reviewedData
        document.processedAt = DateTime.now()
        document.processingNotes = 'Revisado y validado por humano'
        await document.save()
      }

      await review.save()

      return response.json({
        message: 'Revisión actualizada exitosamente',
        review: {
          id: review.id,
          status: review.status,
          reviewedAt: review.reviewedAt
        }
      })
    } catch (error) {
      if (error.messages) {
        return response.status(400).json({
          message: 'Datos inválidos',
          errors: error.messages
        })
      }

      return response.status(500).json({
        message: 'Error al actualizar revisión',
        error: error.message
      })
    }
  }

  /**
   * Obtener lista de usuarios compradores con sus documentos y scores
   */
  async getUsers({ auth, response, request }: HttpContext) {
    const user = auth.user!

    if (!['admin', 'agency_admin'].includes(user.role)) {
      return response.status(403).json({
        message: 'No tienes permisos para ver usuarios'
      })
    }

    try {
      const page = request.input('page', 1)
      const limit = request.input('limit', 50)

      // Importar User model
      const User = (await import('#models/user')).default

      // Obtener usuarios compradores con sus documentos
      const users = await User.query()
        .where('role', 'comprador')
        .preload('documentUploads', (query) => {
          query.preload('review')
        })
        .orderBy('created_at', 'desc')
        .paginate(page, limit)

      const usersData = await Promise.all(users.all().map(async (buyer) => {
        const documents = buyer.documentUploads

        // Calcular score crediticio si existe
        let creditScore = null
        try {
          const { creditScoringService } = await import('#services/credit_scoring_service')
          const scoreResult = await creditScoringService.calculateCreditScore(buyer.id)
          creditScore = {
            score: scoreResult.internalScore,
            riskLevel: scoreResult.riskLevel,
            maxLoanAmount: scoreResult.maxLoanAmount
          }
        } catch (error) {
          // No hay suficientes documentos para calcular score
          creditScore = null
        }

        // Agrupar documentos por tipo y calcular scores
        const documentsByType = {
          bank_statement: null,
          payroll: null,
          tax_return: null,
          id_document: null,
          proof_of_address: null,
          employment_letter: null,
          other: null
        }

        for (const doc of documents) {
          const docData = {
            id: doc.id,
            fileName: doc.fileName,
            status: doc.status,
            uploadedAt: doc.createdAt,
            processedAt: doc.processedAt,
            confidenceScore: doc.review?.confidenceScore || null,
            needsReview: doc.review?.needsReview || false,
            reviewId: doc.review?.id || null
          }

          // Usar el documento más reciente por tipo
          if (!documentsByType[doc.documentType] || doc.createdAt > documentsByType[doc.documentType].uploadedAt) {
            documentsByType[doc.documentType] = docData
          }
        }

        return {
          id: buyer.id,
          fullName: buyer.fullName,
          email: buyer.email,
          phone: buyer.phone,
          status: buyer.status,
          createdAt: buyer.createdAt,
          creditScore,
          documents: documentsByType,
          totalDocuments: documents.length,
          documentsNeedingReview: documents.filter(d => d.review?.needsReview).length
        }
      }))

      return response.json({
        users: usersData,
        meta: users.getMeta()
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al obtener usuarios',
        error: error.message
      })
    }
  }

  /**
   * Obtener documentos de un usuario con URLs firmadas
   */
  async getUserDocuments({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { userId } = params

    if (!['admin', 'agency_admin'].includes(user.role)) {
      return response.status(403).json({
        message: 'No tienes permisos para ver documentos'
      })
    }

    try {
      const DocumentUpload = (await import('#models/document_upload')).default
      const { s3Service } = await import('#services/s3_service')

      const documents = await DocumentUpload.query()
        .where('user_id', userId)
        .preload('review')
        .orderBy('created_at', 'desc')

      const documentsWithUrls = await Promise.all(documents.map(async (doc) => {
        // Generar URL firmada de S3 válida por 1 hora
        const signedUrl = await s3Service.getSignedUrl(doc.filePath, 3600)

        // También proporcionar URL del proxy del backend como fallback
        const proxyUrl = `/api/ai/documents/${doc.id}/view`

        return {
          id: doc.id,
          fileName: doc.fileName,
          documentType: doc.documentType,
          documentTypeDescription: doc.documentTypeDescription,
          status: doc.status,
          uploadedAt: doc.createdAt,
          processedAt: doc.processedAt,
          confidenceScore: doc.review?.confidenceScore || null,
          needsReview: doc.review?.needsReview || false,
          reviewId: doc.review?.id || null,
          downloadUrl: signedUrl, // URL firmada de S3
          proxyUrl: proxyUrl, // URL del proxy del backend
          filePath: doc.filePath,
          extractedData: doc.extractedData
        }
      }))

      return response.json({
        documents: documentsWithUrls
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al obtener documentos',
        error: error.message
      })
    }
  }

  /**
   * Descargar todos los documentos de un usuario como ZIP
   */
  async downloadUserDocumentsZip({ auth, params, response, request }: HttpContext) {
    // Intentar autenticar con token de query param si existe
    let user = auth.user

    if (!user) {
      const tokenFromQuery = request.input('token')
      if (tokenFromQuery) {
        try {
          const User = (await import('#models/user')).default
          const authUser = await User.accessTokens.verify(tokenFromQuery)
          if (authUser) {
            user = authUser
          }
        } catch (error) {
          console.error('Error verifying token:', error)
        }
      }
    }

    if (!user) {
      return response.status(401).json({
        message: 'No autenticado'
      })
    }

    const { userId } = params

    if (!['admin', 'agency_admin'].includes(user.role)) {
      return response.status(403).json({
        message: 'No tienes permisos para descargar documentos'
      })
    }

    try {
      const DocumentUpload = (await import('#models/document_upload')).default
      const User = (await import('#models/user')).default
      const { s3Service } = await import('#services/s3_service')
      const archiver = await import('archiver')
      const { Readable } = await import('node:stream')
      const { GetObjectCommand } = await import('@aws-sdk/client-s3')

      const buyer = await User.findOrFail(userId)
      const documents = await DocumentUpload.query()
        .where('user_id', userId)

      if (documents.length === 0) {
        return response.status(404).json({
          message: 'No hay documentos para descargar'
        })
      }

      // Crear ZIP
      const archive = archiver.default('zip', {
        zlib: { level: 9 }
      })

      // Configurar headers
      response.header('Content-Type', 'application/zip')
      response.header('Content-Disposition', `attachment; filename="${buyer.fullName.replace(/\s+/g, '_')}_documentos.zip"`)

      // Pipe el archivo al response
      archive.pipe(response.response)

      // Agregar cada documento al ZIP
      for (const doc of documents) {
        try {
          // Obtener el archivo de S3
          const command = new GetObjectCommand({
            Bucket: s3Service.getBucketName(),
            Key: doc.filePath
          })

          const s3Response = await s3Service.s3Client.send(command)

          // Convertir el stream de S3 a Node stream
          const stream = s3Response.Body as any

          // Agregar al ZIP con nombre descriptivo
          const fileName = `${doc.documentTypeDescription}_${doc.fileName}`
          archive.append(stream, { name: fileName })
        } catch (error) {
          console.error(`Error adding ${doc.fileName} to ZIP:`, error)
        }
      }

      // Finalizar el ZIP
      await archive.finalize()
    } catch (error) {
      return response.status(500).json({
        message: 'Error al crear ZIP',
        error: error.message
      })
    }
  }

  /**
   * Obtener estadísticas de revisiones
   */
  async getReviewStats({ auth, response }: HttpContext) {
    const user = auth.user!

    if (!['admin', 'agency_admin'].includes(user.role)) {
      return response.status(403).json({
        message: 'No tienes permisos para ver estadísticas'
      })
    }

    try {
      const [pending, inReview, completed, total] = await Promise.all([
        DocumentReview.query().where('status', 'pending').count('* as total'),
        DocumentReview.query().where('status', 'in_review').count('* as total'),
        DocumentReview.query().where('status', 'completed').count('* as total'),
        DocumentReview.query().count('* as total')
      ])

      // Obtener revisiones completadas por el usuario actual
      const myReviews = await DocumentReview.query()
        .where('reviewer_user_id', user.id)
        .where('status', 'completed')
        .count('* as total')

      // Obtener promedio de confianza de extracciones
      const avgConfidence = await DocumentReview.query()
        .avg('confidence_score as average')
        .whereNotNull('confidence_score')
        .first()

      return response.json({
        stats: {
          pending: parseInt(String(pending[0].$extras.total)),
          inReview: parseInt(String(inReview[0].$extras.total)),
          completed: parseInt(String(completed[0].$extras.total)),
          total: parseInt(String(total[0].$extras.total)),
          myReviews: parseInt(String(myReviews[0].$extras.total)),
          averageConfidence: avgConfidence ? Math.round(avgConfidence.$extras.average) : 0
        }
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al obtener estadísticas',
        error: error.message
      })
    }
  }
}

// @ts-nocheck
import type { HttpContext } from '@adonisjs/core/http'
import DocumentUpload from '#models/document_upload'
import DocumentField from '#models/document_field'
import DocumentReview from '#models/document_review'
import { s3Service } from '#services/s3_service'
import vine from '@vinejs/vine'

const uploadDocumentValidator = vine.compile(
  vine.object({
    documentType: vine.enum(['bank_statement', 'payroll', 'tax_return', 'id_document', 'proof_of_address', 'employment_letter', 'other'])
  })
)

export default class DocumentController {
  /**
   * Upload a document
   */
  async upload({ auth, request, response }: HttpContext) {
    const user = auth.user!

    try {
      const payload = await request.validateUsing(uploadDocumentValidator)
      const { documentType } = payload

      // Get the file manually from request
      const file = request.file('file', {
        size: '10mb',
        extnames: ['pdf', 'jpg', 'jpeg', 'png']
      })

      if (!file) {
        return response.status(400).json({
          message: 'No se proporcionó ningún archivo'
        })
      }

      if (!file.isValid) {
        return response.status(400).json({
          message: 'Archivo inválido',
          errors: file.errors
        })
      }

      // Check if user already has this document type uploaded (any status)
      const existingDoc = await DocumentUpload.query()
        .where('user_id', user.id)
        .where('document_type', documentType)
        .first()

      // If exists, delete the old one (both from S3 and database)
      if (existingDoc) {
        try {
          // Delete file from S3
          await s3Service.deleteFile(existingDoc.filePath)
        } catch (s3Error) {
          console.error('Error deleting old file from S3:', s3Error)
          // Continue with upload even if S3 delete fails
        }

        // Delete associated records (DocumentField, DocumentReview)
        const oldFields = await DocumentField.query()
          .where('document_upload_id', existingDoc.id)

        for (const field of oldFields) {
          await field.delete()
        }

        const oldReview = await DocumentReview.query()
          .where('document_upload_id', existingDoc.id)
          .first()

        if (oldReview) {
          await oldReview.delete()
        }

        // Delete the document record
        await existingDoc.delete()
      }

      // Upload to S3 (private folder for documents - requires signed URLs to access)
      const uploadResult = await s3Service.uploadPrivateFile(file, `private/documents/${user.id}`)

      // Create database record
      const document = await DocumentUpload.create({
        userId: user.id,
        fileName: uploadResult.fileName,
        filePath: uploadResult.key,
        fileSize: file.size?.toString(),
        mimeType: file.type,
        documentType: documentType,
        status: 'uploaded'
      })

      // Process document automatically with pattern matching
      // Note: This is async but we don't wait for it to complete
      // The user will see the status change when they check back
      try {
        const { documentExtractionService } = await import('#services/document_extraction_service')
        // Fire and forget - process in background
        documentExtractionService.processDocument(document).catch(error => {
          console.error('Error processing document:', error)
        })
      } catch (error) {
        console.error('Error importing extraction service:', error)
      }
      
      return response.status(201).json({
        message: 'Documento subido exitosamente',
        document: {
          id: document.id,
          fileName: document.fileName,
          documentType: document.documentType,
          documentTypeDescription: document.documentTypeDescription,
          status: document.status,
          statusDescription: document.statusDescription,
          fileSize: document.fileSizeFormatted,
          uploadedAt: document.createdAt
        }
      })
    } catch (error) {
      if (error.messages) {
        return response.status(400).json({
          message: 'Datos de entrada inválidos',
          errors: error.messages
        })
      }

      return response.status(500).json({
        message: 'Error al subir el documento',
        error: error.message
      })
    }
  }

  /**
   * Get user's uploaded documents
   */
  async getUserDocuments({ auth, response }: HttpContext) {
    const user = auth.user!

    try {
      const documents = await DocumentUpload.query()
        .where('user_id', user.id)
        .orderBy('created_at', 'desc')

      const documentsData = documents.map(doc => ({
        id: doc.id,
        fileName: doc.fileName,
        documentType: doc.documentType,
        documentTypeDescription: doc.documentTypeDescription,
        status: doc.status,
        statusDescription: doc.statusDescription,
        fileSize: doc.fileSizeFormatted,
        processingNotes: doc.processingNotes,
        uploadedAt: doc.createdAt,
        processedAt: doc.processedAt,
        extractedData: doc.extractedData
      }))

      // Generate signed URLs for documents
      const documentsWithUrls = await Promise.all(
        documents.map(async (doc) => {
          const signedUrl = await s3Service.getSignedUrl(doc.filePath, 3600) // 1 hora
          return {
            id: doc.id,
            fileName: doc.fileName,
            documentType: doc.documentType,
            documentTypeDescription: doc.documentTypeDescription,
            status: doc.status,
            statusDescription: doc.statusDescription,
            fileSize: doc.fileSizeFormatted,
            processingNotes: doc.processingNotes,
            uploadedAt: doc.createdAt,
            processedAt: doc.processedAt,
            viewUrl: signedUrl, // URL firmada para ver el documento
            extractedData: doc.extractedData
          }
        })
      )

      return response.json({
        documents: documentsWithUrls,
        total: documents.length
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al obtener los documentos',
        error: error.message
      })
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { documentId } = params
    
    try {
      const document = await DocumentUpload.query()
        .where('id', documentId)
        .where('user_id', user.id)
        .first()

      if (!document) {
        return response.status(404).json({
          message: 'Documento no encontrado'
        })
      }

      // Check if document is being processed
      if (document.status === 'processing') {
        return response.status(400).json({
          message: 'No puedes eliminar un documento que se está procesando'
        })
      }

      // Delete file from S3
      try {
        await s3Service.deleteFile(document.filePath)
      } catch (s3Error) {
        console.error('Error deleting file from S3:', s3Error)
        // Continue with database deletion even if S3 delete fails
      }

      await document.delete()

      return response.json({
        message: 'Documento eliminado exitosamente'
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al eliminar el documento',
        error: error.message
      })
    }
  }

  /**
   * Get signed URL to view a document
   */
  async getDocumentUrl({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { documentId } = params

    try {
      const document = await DocumentUpload.query()
        .where('id', documentId)
        .where('user_id', user.id)
        .first()

      if (!document) {
        return response.status(404).json({
          message: 'Documento no encontrado'
        })
      }

      // Generate signed URL valid for 1 hour
      const signedUrl = await s3Service.getSignedUrl(document.filePath, 3600)

      return response.json({
        viewUrl: signedUrl,
        expiresIn: 3600,
        fileName: document.fileName
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al generar URL del documento',
        error: error.message
      })
    }
  }

  /**
   * Get document processing status
   */
  async getDocumentStatus({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { documentId } = params
    
    try {
      const document = await DocumentUpload.query()
        .where('id', documentId)
        .where('user_id', user.id)
        .first()

      if (!document) {
        return response.status(404).json({
          message: 'Documento no encontrado'
        })
      }

      return response.json({
        id: document.id,
        status: document.status,
        statusDescription: document.statusDescription,
        processingNotes: document.processingNotes,
        extractedData: document.extractedData,
        processedAt: document.processedAt
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al obtener el estado del documento',
        error: error.message
      })
    }
  }

  /**
   * Reprocess a document
   */
  async reprocessDocument({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { documentId } = params

    try {
      // Si es admin o agency_admin, puede reprocesar cualquier documento
      // Si no, solo puede reprocesar sus propios documentos
      const query = DocumentUpload.query().where('id', documentId)

      if (!['admin', 'agency_admin'].includes(user.role)) {
        query.where('user_id', user.id)
      }

      const document = await query.first()

      if (!document) {
        return response.status(404).json({
          message: 'Documento no encontrado'
        })
      }

      // Permitir reprocesar incluso si está en processing (forzar reprocesamiento)
      console.log(`Reprocesando documento ${document.id} - Status actual: ${document.status}`)

      // Reset document status for reprocessing
      document.status = 'uploaded'
      document.extractedData = null
      document.processingNotes = 'Reprocesamiento solicitado manualmente'
      document.processedAt = null
      await document.save()

      // Reprocess document with extraction service
      try {
        const { documentExtractionService } = await import('#services/document_extraction_service')
        // Usar processDocument en lugar de reprocessDocument para forzar procesamiento completo
        await documentExtractionService.processDocument(document)

        console.log(`✅ Documento ${document.id} reprocesado exitosamente`)
      } catch (error) {
        console.error('Error reprocessing document:', error)
        document.status = 'failed'
        document.processingNotes = `Error en reprocesamiento: ${error.message}`
        await document.save()

        return response.status(500).json({
          message: 'Error al reprocesar el documento',
          error: error.message
        })
      }

      // Recargar el documento para obtener los datos actualizados
      await document.refresh()

      return response.json({
        message: 'Documento reprocesado exitosamente',
        document: {
          id: document.id,
          status: document.status,
          statusDescription: document.statusDescription,
          extractedData: document.extractedData
        }
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al reprocesar el documento',
        error: error.message
      })
    }
  }

  /**
   * Rate a document (human feedback for ML)
   */
  async rateDocument({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const { documentId } = params

    try {
      const { score, feedback } = request.only(['score', 'feedback'])

      if (!score || score < 0 || score > 100) {
        return response.status(400).json({
          message: 'Score debe estar entre 0 y 100'
        })
      }

      // Si es admin o agency_admin, puede calificar cualquier documento
      // Si no, solo puede calificar sus propios documentos
      const query = DocumentUpload.query().where('id', documentId)

      if (!['admin', 'agency_admin'].includes(user.role)) {
        query.where('user_id', user.id)
      }

      const document = await query.first()

      if (!document) {
        return response.status(404).json({
          message: 'Documento no encontrado'
        })
      }

      // Buscar o crear DocumentReview
      let review = await DocumentReview.query()
        .where('document_upload_id', document.id)
        .first()

      if (!review) {
        review = await DocumentReview.create({
          documentUploadId: document.id,
          status: 'completed',
          confidenceScore: score,
          extractionNotes: feedback || `Calificación manual por ${user.email}`,
          autoExtractedData: null,
          humanFeedback: feedback,
          humanScore: score,
          reviewedBy: user.id
        })
      } else {
        review.humanFeedback = feedback
        review.humanScore = score
        review.reviewedBy = user.id
        review.confidenceScore = score // Actualizar el score con la calificación humana
        await review.save()
      }

      // Recalcular el score crediticio del usuario
      try {
        const { creditScoreCalculator } = await import('#services/credit_score_calculator')
        await creditScoreCalculator.updateCreditScore(document.userId)
        console.log(`✅ Score crediticio recalculado para usuario ${document.userId}`)
      } catch (calcError) {
        console.error('Error recalculando score crediticio:', calcError)
        // No fallar la request si falla el cálculo del score
      }

      return response.json({
        message: 'Calificación guardada exitosamente',
        review: {
          id: review.id,
          score: score,
          feedback: feedback
        }
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al guardar la calificación',
        error: error.message
      })
    }
  }
}
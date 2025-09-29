import type { HttpContext } from '@adonisjs/core/http'
import DocumentUpload from '#models/document_upload'
import { s3Service } from '#services/s3_service'
import { MultipartFile } from '@adonisjs/core/bodyparser'
import vine from '@vinejs/vine'

const uploadDocumentValidator = vine.compile(
  vine.object({
    documentType: vine.enum(['bank_statement', 'payroll', 'tax_return', 'id_document', 'proof_of_address', 'employment_letter', 'other']),
    file: vine.file({
      size: '10mb',
      extnames: ['pdf', 'jpg', 'jpeg', 'png']
    })
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
      const { documentType, file } = payload

      // Check if user already has this document type uploaded and processed
      const existingDoc = await DocumentUpload.query()
        .where('user_id', user.id)
        .where('document_type', documentType)
        .where('status', 'processed')
        .first()

      if (existingDoc) {
        return response.status(400).json({
          message: `Ya tienes un documento de tipo "${existingDoc.documentTypeDescription}" procesado. Elimínalo primero si deseas subir uno nuevo.`,
          existingDocument: {
            id: existingDoc.id,
            fileName: existingDoc.fileName,
            uploadedAt: existingDoc.createdAt
          }
        })
      }

      // Upload to S3 (private folder for documents)
      const uploadResult = await s3Service.uploadFile(file, `private/documents/${user.id}`)

      // Create database record
      const document = await DocumentUpload.create({
        userId: user.id,
        fileName: file.clientName,
        filePath: uploadResult.key,
        fileSize: file.size?.toString(),
        mimeType: file.type,
        documentType: documentType,
        status: 'uploaded'
      })

      // TODO: Queue job to process document with AI/OCR service
      // This will be implemented when we create the Python service
      
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
        processedAt: doc.processedAt
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
            viewUrl: signedUrl // URL firmada para ver el documento
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
      const document = await DocumentUpload.query()
        .where('id', documentId)
        .where('user_id', user.id)
        .first()

      if (!document) {
        return response.status(404).json({
          message: 'Documento no encontrado'
        })
      }

      if (document.status === 'processing') {
        return response.status(400).json({
          message: 'El documento ya se está procesando'
        })
      }

      // Reset document status for reprocessing
      document.status = 'uploaded'
      document.extractedData = null
      document.processingNotes = null
      document.processedAt = null
      await document.save()

      // TODO: Queue job to reprocess document with AI/OCR service
      
      return response.json({
        message: 'Documento marcado para reprocesamiento',
        document: {
          id: document.id,
          status: document.status,
          statusDescription: document.statusDescription
        }
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al reprocesar el documento',
        error: error.message
      })
    }
  }
}
import type { HttpContext } from '@adonisjs/core/http'
import { cuid } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'
import { join } from 'node:path'
import { access, mkdir } from 'node:fs/promises'

export default class AssetsController {
  async uploadMedia({ request, response }: HttpContext) {
    try {
      const files = request.files('files')
      
      if (!files || files.length === 0) {
        return response.badRequest({
          success: false,
          message: 'No files uploaded'
        })
      }

      const uploadedFiles = []
      const uploadsPath = join(app.publicPath(), 'uploads')
      
      // Ensure uploads directory exists
      try {
        await access(uploadsPath)
      } catch {
        await mkdir(uploadsPath, { recursive: true })
      }

      for (const file of files) {
        if (!file.isValid) {
          continue
        }

        // Generate unique filename
        const fileName = `${cuid()}.${file.extname}`
        const filePath = join(uploadsPath, fileName)
        
        // Move file to uploads directory
        await file.move(app.publicPath('uploads'), {
          name: fileName,
          overwrite: true
        })

        const fileUrl = `http://localhost:3333/uploads/${fileName}`
        
        // Determine file type by MIME type and extension
        console.log('File info:', {
          clientName: file.clientName,
          mimeType: file.type,
          extension: file.extname
        });
        
        let fileType = 'other';
        
        // First check by extension (more reliable)
        const ext = file.extname?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
          fileType = 'image';
        } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) {
          fileType = 'video';
        } else if (file.type?.startsWith('image/')) {
          fileType = 'image';
        } else if (file.type?.startsWith('video/')) {
          fileType = 'video';
        }
        
        console.log('Determined file type:', fileType);
        
        uploadedFiles.push({
          fileName: file.clientName,
          serverName: fileName,
          fileUrl: fileUrl,
          type: fileType,
          size: file.size,
          mimeType: file.type
        })
      }

      return response.ok({
        success: true,
        data: uploadedFiles
      })
    } catch (error) {
      console.error('Upload error:', error)
      return response.internalServerError({
        success: false,
        message: 'Error uploading files',
        error: error.message
      })
    }
  }
}
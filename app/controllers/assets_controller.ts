import type { HttpContext } from '@adonisjs/core/http'
import { s3Service } from '#services/s3_service'

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

      for (const file of files) {
        if (!file.isValid) {
          continue
        }

        // Upload to S3 (public folder for media)
        const uploadResult = await s3Service.uploadFile(file, 'public/media')

        // Determine file type by MIME type and extension
        console.log('File info:', {
          clientName: file.clientName,
          mimeType: file.type || 'application/octet-stream',
          extension: file.extname
        });

        let fileType = 'other';

        // First check by extension (more reliable)
        const ext = file.extname?.toLowerCase() || '';
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
          fileName: uploadResult.fileName,
          serverName: uploadResult.key.split('/').pop(),
          fileUrl: uploadResult.url,
          s3Key: uploadResult.key,
          type: fileType,
          size: file.size,
          mimeType: file.type || 'application/octet-stream'
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
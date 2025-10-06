import type { HttpContext } from '@adonisjs/core/http'
import { s3Service } from '#services/s3_service'
import { GetObjectCommand } from '@aws-sdk/client-s3'

export default class S3ProxyController {
  /**
   * Proxy S3 files in development environment
   * This avoids SSL certificate issues with bucket names containing dots
   */
  async proxy({ request, response }: HttpContext) {
    try {
      // Get the key from the URL path
      // URL format: /api/s3-proxy/public/media/filename.jpg
      const path = request.url().replace('/api/s3-proxy/', '')

      if (!path) {
        return response.badRequest({
          success: false,
          message: 'File path is required'
        })
      }

      // Get object from S3
      const command = new GetObjectCommand({
        Bucket: s3Service.getBucketName(),
        Key: path,
      })

      const s3Response = await s3Service.s3Client.send(command)

      // Set appropriate headers
      response.header('Content-Type', s3Response.ContentType || 'application/octet-stream')
      response.header('Content-Length', s3Response.ContentLength?.toString() || '0')
      response.header('Cache-Control', 'public, max-age=31536000') // Cache for 1 year

      if (s3Response.ETag) {
        response.header('ETag', s3Response.ETag)
      }

      // Stream the response
      if (s3Response.Body) {
        // Convert the stream to buffer and send
        const chunks: any[] = []
        for await (const chunk of s3Response.Body as any) {
          chunks.push(chunk)
        }
        const buffer = Buffer.concat(chunks)
        return response.send(buffer)
      }

      return response.notFound({
        success: false,
        message: 'File not found'
      })
    } catch (error) {
      console.error('S3 Proxy Error:', error)

      if (error.name === 'NoSuchKey') {
        return response.notFound({
          success: false,
          message: 'File not found'
        })
      }

      return response.internalServerError({
        success: false,
        message: 'Error fetching file from S3',
        error: error.message
      })
    }
  }
}

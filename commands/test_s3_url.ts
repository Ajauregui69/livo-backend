import { BaseCommand } from '@adonisjs/core/ace'
import { s3Service } from '#services/s3_service'

export default class TestS3Url extends BaseCommand {
  static commandName = 'test:s3'
  static description = 'Test S3 signed URL generation'

  async run() {
    try {
      // List files first to get the most recent one
      const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3')
      const env = (await import('#start/env')).default

      const s3Client = new S3Client({
        region: env.get('AWS_REGION'),
        credentials: {
          accessKeyId: env.get('AWS_ACCESS_KEY_ID'),
          secretAccessKey: env.get('AWS_SECRET_ACCESS_KEY'),
        },
      })

      const listCommand = new ListObjectsV2Command({
        Bucket: s3Service.getBucketName(),
        Prefix: 'private/documents/',
        MaxKeys: 10
      })

      const listResponse = await s3Client.send(listCommand)

      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        this.logger.error('No files found in private/documents/')
        return
      }

      // Sort by LastModified and get the most recent
      const sortedFiles = listResponse.Contents.sort((a, b) => {
        return (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)
      })

      const testKey = sortedFiles[0].Key!

      this.logger.info('Testing S3 signed URL generation...')
      this.logger.info(`Bucket: ${s3Service.getBucketName()}`)
      this.logger.info(`Testing most recent file: ${testKey}`)
      this.logger.info(`Uploaded: ${sortedFiles[0].LastModified}`)

      const signedUrl = await s3Service.getSignedUrl(testKey, 3600)

      this.logger.info(`Signed URL generated: ${signedUrl}`)

      // Test if URL works
      const response = await fetch(signedUrl, { method: 'HEAD' })

      if (response.ok) {
        this.logger.success('✅ Signed URL works! File is accessible')
        this.logger.success(`Content-Type: ${response.headers.get('content-type')}`)
        this.logger.success(`Content-Length: ${response.headers.get('content-length')}`)
      } else {
        this.logger.error(`❌ Signed URL failed with status: ${response.status}`)
        const text = await response.text()
        this.logger.error(`Response: ${text.substring(0, 500)}`)
      }
    } catch (error) {
      this.logger.error('Error testing S3:', error.message)
      this.logger.error(error.stack)
    }
  }
}

import { BaseCommand } from '@adonisjs/core/ace'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import env from '#start/env'

export default class ListS3Files extends BaseCommand {
  static commandName = 'list:s3'
  static description = 'List files in S3 bucket'

  async run() {
    try {
      const s3Client = new S3Client({
        region: env.get('AWS_REGION'),
        credentials: {
          accessKeyId: env.get('AWS_ACCESS_KEY_ID'),
          secretAccessKey: env.get('AWS_SECRET_ACCESS_KEY'),
        },
      })

      const bucket = env.get('AWS_S3_BUCKET')
      const prefix = 'private/documents/'

      this.logger.info(`Listing files in bucket: ${bucket}`)
      this.logger.info(`Prefix: ${prefix}`)

      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: 50
      })

      const response = await s3Client.send(command)

      if (!response.Contents || response.Contents.length === 0) {
        this.logger.warning('No files found!')
        return
      }

      this.logger.success(`Found ${response.Contents.length} files:`)

      for (const obj of response.Contents) {
        this.logger.info(`  - ${obj.Key} (${obj.Size} bytes, ${obj.LastModified})`)
      }
    } catch (error) {
      this.logger.error('Error listing S3 files:', error.message)
      this.logger.error(error.stack)
    }
  }
}

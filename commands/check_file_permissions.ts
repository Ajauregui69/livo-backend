import { BaseCommand } from '@adonisjs/core/ace'
import { S3Client, GetObjectAclCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import env from '#start/env'

export default class CheckFilePermissions extends BaseCommand {
  static commandName = 'check:file'
  static description = 'Check file permissions in S3'

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
      const key = 'private/documents/8b1fd0a6-ae2b-4512-8372-ec7e23e82829/v6zfi9gco3qbrd38s3ew9oyk.pdf'

      this.logger.info(`Checking permissions for: ${key}`)

      // Try to get object
      try {
        const getCommand = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
        const response = await s3Client.send(getCommand)
        this.logger.success('✅ GetObject works! Can read the file')
      } catch (error: any) {
        this.logger.error(`❌ GetObject failed: ${error.message}`)
      }

      // Try to get ACL
      try {
        const aclCommand = new GetObjectAclCommand({
          Bucket: bucket,
          Key: key,
        })
        const aclResponse = await s3Client.send(aclCommand)
        this.logger.success('✅ Can read ACL')
        this.logger.info(`Owner: ${aclResponse.Owner?.DisplayName} (${aclResponse.Owner?.ID})`)
        this.logger.info('Grants:')
        for (const grant of aclResponse.Grants || []) {
          this.logger.info(`  - ${grant.Grantee?.Type}: ${grant.Permission}`)
        }
      } catch (error: any) {
        this.logger.error(`❌ GetObjectAcl failed: ${error.message}`)
      }
    } catch (error: any) {
      this.logger.error('Error:', error.message)
    }
  }
}

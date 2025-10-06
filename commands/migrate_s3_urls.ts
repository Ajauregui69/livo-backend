import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'

export default class MigrateS3Urls extends BaseCommand {
  static commandName = 'migrate:s3urls'
  static description = 'Migrate S3 URLs from virtual-hosted style to path-style format'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const bucketName = env.get('AWS_S3_BUCKET')
    const region = env.get('AWS_REGION')

    const oldPattern = `https://${bucketName}.s3.${region}.amazonaws.com/`
    const newPattern = `https://s3.${region}.amazonaws.com/${bucketName}/`

    this.logger.info(`Migrating S3 URLs...`)
    this.logger.info(`From: ${oldPattern}`)
    this.logger.info(`To: ${newPattern}`)

    try {
      // Update assets table
      const assetsResult = await db.rawQuery(
        `UPDATE assets
         SET file_url = REPLACE(file_url, ?, ?)
         WHERE file_url LIKE ?`,
        [oldPattern, newPattern, `${oldPattern}%`]
      )

      this.logger.success(`Updated ${assetsResult.rowCount || 0} records in assets`)

      // Update agents table (image column)
      const agentsResult = await db.rawQuery(
        `UPDATE agents
         SET image = REPLACE(image, ?, ?)
         WHERE image LIKE ?`,
        [oldPattern, newPattern, `${oldPattern}%`]
      )

      this.logger.success(`Updated ${agentsResult.rowCount || 0} records in agents`)

      // Update users table (image column if exists)
      try {
        const usersResult = await db.rawQuery(
          `UPDATE users
           SET image = REPLACE(image, ?, ?)
           WHERE image LIKE ?`,
          [oldPattern, newPattern, `${oldPattern}%`]
        )

        this.logger.success(`Updated ${usersResult.rowCount || 0} records in users`)
      } catch (error) {
        this.logger.warning('Users table might not have image column, skipping...')
      }

      // Update document_uploads table
      try {
        const documentsResult = await db.rawQuery(
          `UPDATE document_uploads
           SET file_url = REPLACE(file_url, ?, ?)
           WHERE file_url LIKE ?`,
          [oldPattern, newPattern, `${oldPattern}%`]
        )

        this.logger.success(`Updated ${documentsResult.rowCount || 0} records in document_uploads`)
      } catch (error) {
        this.logger.warning('Document_uploads table might not exist, skipping...')
      }

      this.logger.success('✅ S3 URL migration completed!')

    } catch (error) {
      this.logger.error('❌ Error migrating S3 URLs:')
      this.logger.error(error.message)
      throw error
    }
  }
}

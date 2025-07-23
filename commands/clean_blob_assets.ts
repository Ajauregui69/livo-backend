import { BaseCommand } from '@adonisjs/core/commands'
import type { CommandOptions } from '@adonisjs/core/types'
import Asset from '#models/asset'

export default class CleanBlobAssets extends BaseCommand {
  static commandName = 'clean:blob-assets'
  static description = 'Clean blob URLs from assets table'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Starting cleanup of blob URLs from assets...')

    try {
      // Find all assets with blob URLs
      const blobAssets = await Asset.query()
        .where('file_url', 'like', 'blob:%')
        .orWhere('file_path', 'like', 'blob:%')

      this.logger.info(`Found ${blobAssets.length} assets with blob URLs`)

      if (blobAssets.length > 0) {
        // Delete assets with blob URLs
        const deletedCount = await Asset.query()
          .where('file_url', 'like', 'blob:%')
          .orWhere('file_path', 'like', 'blob:%')
          .delete()

        this.logger.success(`Deleted ${deletedCount} assets with blob URLs`)
      } else {
        this.logger.info('No blob URLs found to clean')
      }

    } catch (error) {
      this.logger.error('Error cleaning blob assets:', error.message)
      this.exitCode = 1
    }
  }
}
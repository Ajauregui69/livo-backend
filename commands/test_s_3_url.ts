import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class TestS3Url extends BaseCommand {
  static commandName = 'test:s-3-url'
  static description = ''

  static options: CommandOptions = {}

  async run() {
    this.logger.info('Hello world from "TestS3Url"')
  }
}
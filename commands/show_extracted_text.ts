import { BaseCommand, args } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import DocumentUpload from '#models/document_upload'
import { s3Service } from '#services/s3_service'

export default class ShowExtractedText extends BaseCommand {
  static commandName = 'document:show-text'
  static description = 'Mostrar texto extraído de un documento'

  @args.string({ description: 'Nombre del archivo (parcial)' })
  declare fileName: string

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info(`🔍 Buscando: ${this.fileName}\n`)

    try {
      const doc = await DocumentUpload.query()
        .where('file_name', 'like', `%${this.fileName}%`)
        .first()

      if (!doc) {
        this.logger.error('No encontrado')
        return
      }

      this.logger.info(`📄 ${doc.fileName}`)
      this.logger.info(`   Tipo: ${doc.documentType}\n`)

      // Descargar y extraer texto
      const { GetObjectCommand } = await import('@aws-sdk/client-s3')

      const command = new GetObjectCommand({
        Bucket: s3Service.getBucketName(),
        Key: doc.filePath
      })

      const response = await s3Service.s3Client.send(command)
      const chunks: Buffer[] = []
      const stream = response.Body as any

      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      const fileBuffer = Buffer.concat(chunks)
      const isPdf = doc.mimeType?.includes('pdf') || doc.fileName.toLowerCase().endsWith('.pdf')

      let text = ''

      if (isPdf) {
        // Extraer texto nativo del PDF
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(fileBuffer),
          useSystemFonts: true,
          verbosity: 0
        })

        const pdfDocument = await loadingTask.promise

        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
          const page = await pdfDocument.getPage(pageNum)
          const textContent = await page.getTextContent()
          const pageText = textContent.items.map((item: any) => item.str).join(' ')
          text += pageText + '\n'
        }

        this.logger.success(`✅ Texto extraído: ${text.length} caracteres\n`)
        this.logger.info('TEXTO COMPLETO:')
        this.logger.info('─'.repeat(80))
        console.log(text)
        this.logger.info('─'.repeat(80))
      }

    } catch (error) {
      this.logger.error(`❌ ${error.message}`)
      this.exitCode = 1
    }
  }
}

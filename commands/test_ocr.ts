import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import DocumentUpload from '#models/document_upload'
import { s3Service } from '#services/s3_service'

export default class TestOcr extends BaseCommand {
  static commandName = 'test:ocr'
  static description = 'Probar OCR en un documento específico'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('🔍 Probando OCR en documentos...\n')

    try {
      const doc = await DocumentUpload.query().first()

      if (!doc) {
        this.logger.error('No hay documentos en la base de datos')
        return
      }

      this.logger.info(`📄 Documento: ${doc.fileName}`)
      this.logger.info(`   Tipo: ${doc.documentType}`)
      this.logger.info(`   MIME: ${doc.mimeType}`)
      this.logger.info(`   Ruta S3: ${doc.filePath}\n`)

      // Descargar archivo
      this.logger.info('⬇️  Descargando de S3...')
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
      this.logger.success(`✅ Descargado: ${fileBuffer.length} bytes\n`)

      // Probar extracción de texto nativo PDF
      if (doc.mimeType === 'application/pdf') {
        this.logger.info('📖 Intentando extracción de texto nativo PDF...')
        try {
          const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
          const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(fileBuffer),
            useSystemFonts: true,
            verbosity: 0
          })

          const pdfDocument = await loadingTask.promise
          this.logger.info(`   Páginas: ${pdfDocument.numPages}`)

          let nativeText = ''
          for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum)
            const textContent = await page.getTextContent()
            const pageText = textContent.items.map((item: any) => item.str).join(' ')
            nativeText += pageText + '\n'
          }

          if (nativeText.trim().length > 0) {
            this.logger.success(`✅ Texto nativo extraído: ${nativeText.trim().length} caracteres`)
            this.logger.info(`   Primeros 200 chars: ${nativeText.trim().substring(0, 200)}`)
          } else {
            this.logger.warning(`⚠️  No hay texto nativo en el PDF, necesita OCR`)
          }
        } catch (error) {
          this.logger.error(`❌ Error PDF: ${error.message}`)
        }

        // Probar OCR
        this.logger.info('\n🔍 Probando OCR con Tesseract...')
        try {
          const { pdfToPng } = await import('pdf-to-png-converter')

          this.logger.info('   Convirtiendo PDF a imágenes...')
          const pngPages = await pdfToPng(fileBuffer, {
            outputFolder: '/tmp',
            viewportScale: 2.0,
            pagesToProcess: [1] // Solo primera página para test
          })

          this.logger.success(`   ✅ ${pngPages.length} páginas convertidas`)

          if (pngPages.length > 0) {
            this.logger.info('   Ejecutando OCR en primera página...')
            const { createWorker } = await import('tesseract.js')

            const worker = await createWorker('spa', 1, {
              logger: (m: any) => {
                if (m.status === 'recognizing text') {
                  this.logger.info(`   OCR Progress: ${Math.round(m.progress * 100)}%`)
                }
              }
            })

            const { data } = await worker.recognize(pngPages[0].content)
            await worker.terminate()

            if (data.text.trim().length > 0) {
              this.logger.success(`✅ OCR extraído: ${data.text.trim().length} caracteres`)
              this.logger.info(`   Confianza: ${data.confidence}%`)
              this.logger.info(`   Primeros 200 chars: ${data.text.trim().substring(0, 200)}`)
            } else {
              this.logger.error(`❌ OCR no extrajo texto`)
            }
          }
        } catch (error) {
          this.logger.error(`❌ Error OCR: ${error.message}`)
          this.logger.error(`   Stack: ${error.stack}`)
        }
      }

    } catch (error) {
      this.logger.error(`\n❌ ERROR GENERAL: ${error.message}`)
      this.logger.error(`   Stack: ${error.stack}`)
      this.exitCode = 1
    }
  }
}

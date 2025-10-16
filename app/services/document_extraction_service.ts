// @ts-nocheck
import ExtractionRule from '#models/extraction_rule'
import DocumentUpload from '#models/document_upload'
import DocumentReview from '#models/document_review'
import DocumentField from '#models/document_field'
import { s3Service } from '#services/s3_service'

interface ExtractionResult {
  fields: Array<{
    fieldName: string
    fieldType: 'text' | 'number' | 'date' | 'currency'
    extractedValue: string | null
    confidence: number
    extractionMethod: string
  }>
  overallConfidence: number
  needsReview: boolean
  extractionNotes: string[]
}

class DocumentExtractionService {
  /**
   * Procesa un documento y extrae información usando MoonshotAI + OCR + Regex
   */
  async processDocument(documentUpload: DocumentUpload): Promise<void> {
    try {
      console.log(`🔍 Procesando documento ${documentUpload.id} con OCR y MoonshotAI...`)

      // 1. Obtener el contenido del documento desde S3
      const documentText = await this.getDocumentText(documentUpload)

      if (documentText === null) {
        throw new Error('Error al leer el archivo')
      }

      console.log(`📝 Texto extraído: ${documentText.length} caracteres`)

      if (documentText === '') {
        documentUpload.status = 'failed'
        documentUpload.processingNotes = 'No se pudo extraer texto del documento'
        await documentUpload.save()
        return
      }

      // 2. Intentar análisis con MoonshotAI primero
      let moonshotResult = null
      let useMoonshot = true

      try {
        console.log('🤖 Analizando con MoonshotAI...')
        const { moonshotAIService } = await import('#services/moonshot_ai_service')
        moonshotResult = await moonshotAIService.analyzeDocument(
          documentUpload.documentType,
          documentText
        )
        console.log(`✨ MoonshotAI completado - Confianza: ${moonshotResult.confidence}%`)
      } catch (moonshotError) {
        console.warn('⚠️ Error con MoonshotAI, usando método tradicional:', moonshotError.message)
        useMoonshot = false
      }

      let extractedData: Record<string, any>
      let confidence: number
      let needsReview: boolean
      let processingNotes: string

      if (useMoonshot && moonshotResult) {
        // Usar resultados de MoonshotAI
        extractedData = moonshotResult.extractedData
        confidence = moonshotResult.confidence
        needsReview = confidence < 75 // Umbral más alto para IA

        // Agregar el análisis de MoonshotAI
        extractedData._moonshotAnalysis = {
          analysis: moonshotResult.analysis,
          recommendations: moonshotResult.recommendations,
          haviScore: moonshotResult.haviScore,
          riskLevel: moonshotResult.riskLevel
        }

        processingNotes = needsReview
          ? `Análisis con MoonshotAI (confianza ${confidence}%) - Requiere revisión. ${moonshotResult.analysis}`
          : `Análisis con MoonshotAI completado (confianza ${confidence}%). ${moonshotResult.analysis}`
      } else {
        // Fallback: usar método tradicional con reglas
        console.log('📋 Usando método tradicional con reglas...')
        const rules = await ExtractionRule.query()
          .where('document_type', documentUpload.documentType)
          .where('is_active', true)
          .orderBy('priority', 'desc')

        if (rules.length === 0) {
          await this.createReviewForManualProcessing(documentUpload, documentText)
          return
        }

        const extractionResult = await this.extractDataUsingRules(documentText, rules)
        console.log(`📊 Campos extraídos: ${extractionResult.fields.length}`)

        extractedData = this.fieldsToObject(extractionResult.fields)
        confidence = extractionResult.overallConfidence
        needsReview = extractionResult.needsReview

        // Agregar análisis tradicional
        const traditionalAnalysis = this.generateDocumentAnalysis(
          documentUpload.documentType,
          extractedData
        )
        extractedData._analysis = traditionalAnalysis

        processingNotes = needsReview
          ? `Extracción tradicional (confianza ${confidence}%) - Requiere revisión. ${traditionalAnalysis.summary}`
          : `Extracción tradicional completada (confianza ${confidence}%). ${traditionalAnalysis.summary}`

        // Crear registros de campos para el método tradicional
        const documentReview = await DocumentReview.create({
          documentUploadId: documentUpload.id,
          status: needsReview ? 'pending' : 'completed',
          confidenceScore: confidence,
          extractionNotes: extractionResult.extractionNotes.join('\n'),
          autoExtractedData: extractedData
        })

        for (const field of extractionResult.fields) {
          await DocumentField.create({
            documentUploadId: documentUpload.id,
            documentReviewId: documentReview.id,
            fieldName: field.fieldName,
            fieldType: field.fieldType,
            extractedValue: field.extractedValue,
            confidence: field.confidence,
            extractionMethod: field.extractionMethod,
            wasCorrected: false
          })
        }
      }

      // Actualizar el documento con los datos extraídos
      const { DateTime } = await import('luxon')

      documentUpload.status = needsReview ? 'processing' : 'processed'
      documentUpload.extractedData = extractedData
      documentUpload.processedAt = DateTime.now()
      documentUpload.processingNotes = processingNotes
      await documentUpload.save()

      console.log(`✅ Documento procesado - Status: ${documentUpload.status}`)

      // Recalcular score crediticio del usuario
      try {
        const { creditScoreCalculator } = await import('#services/credit_score_calculator')
        await creditScoreCalculator.updateCreditScore(documentUpload.userId)
        console.log(`✅ Score crediticio actualizado para usuario ${documentUpload.userId}`)
      } catch (scoreError) {
        console.error('Error actualizando score crediticio:', scoreError)
      }

    } catch (error) {
      console.error('Error processing document:', error)
      documentUpload.status = 'failed'
      documentUpload.processingNotes = `Error: ${error.message}`
      await documentUpload.save()
      throw error
    }
  }

  /**
   * Genera análisis automático del documento basado en los datos extraídos
   */
  private generateDocumentAnalysis(
    docType: string,
    extractedData: Record<string, any>
  ): { summary: string; haviPoints: number; details: string[] } {
    const details: string[] = []
    let haviPoints = 0

    switch (docType) {
      case 'bank_statement':
        return this.analyzeBankStatement(extractedData)
      case 'payroll':
        return this.analyzePayroll(extractedData)
      case 'tax_return':
        return this.analyzeTaxReturn(extractedData)
      case 'id_document':
        return this.analyzeIdDocument(extractedData)
      case 'proof_of_address':
        return this.analyzeProofOfAddress(extractedData)
      case 'employment_letter':
        return this.analyzeEmploymentLetter(extractedData)
      default:
        return {
          summary: 'Documento procesado',
          haviPoints: 5,
          details: ['Datos básicos extraídos']
        }
    }
  }

  private analyzeBankStatement(data: Record<string, any>): { summary: string; haviPoints: number; details: string[] } {
    const details: string[] = []
    let points = 0

    const balance = this.getNumericValue(data, ['saldo_actual', 'balance', 'saldo'])
    const income = this.getNumericValue(data, ['ingreso_mensual', 'monthly_income'])
    const expenses = this.getNumericValue(data, ['gastos_mensuales', 'monthly_expenses'])

    if (balance !== null) {
      if (balance >= 50000) {
        points += 15
        details.push(`Saldo excelente: $${balance.toLocaleString()}`)
      } else if (balance >= 20000) {
        points += 10
        details.push(`Buen saldo: $${balance.toLocaleString()}`)
      } else {
        points += 5
        details.push(`Saldo: $${balance.toLocaleString()}`)
      }
    }

    if (income !== null && expenses !== null && income > 0) {
      const savingsRate = ((income - expenses) / income) * 100
      if (savingsRate >= 20) {
        points += 20
        details.push(`Excelente capacidad de ahorro: ${savingsRate.toFixed(0)}%`)
      } else if (savingsRate >= 10) {
        points += 12
        details.push(`Buena capacidad de ahorro: ${savingsRate.toFixed(0)}%`)
      } else {
        points += 5
        details.push(`Capacidad de ahorro: ${savingsRate.toFixed(0)}%`)
      }
    }

    return {
      summary: `Análisis: Saldo ${balance ? '$' + balance.toLocaleString() : 'N/A'}`,
      haviPoints: points,
      details
    }
  }

  private analyzePayroll(data: Record<string, any>): { summary: string; haviPoints: number; details: string[] } {
    const details: string[] = []
    let points = 0

    const netSalary = this.getNumericValue(data, ['salario_neto', 'net_salary'])

    if (netSalary !== null) {
      if (netSalary >= 25000) {
        points += 20
        details.push(`Salario excelente: $${netSalary.toLocaleString()}`)
      } else if (netSalary >= 15000) {
        points += 15
        details.push(`Buen salario: $${netSalary.toLocaleString()}`)
      } else {
        points += 10
        details.push(`Salario: $${netSalary.toLocaleString()}`)
      }
    }

    return {
      summary: `Salario neto: ${netSalary ? '$' + netSalary.toLocaleString() : 'N/A'}`,
      haviPoints: points,
      details
    }
  }

  private analyzeTaxReturn(data: Record<string, any>): { summary: string; haviPoints: number; details: string[] } {
    const details: string[] = []
    let points = 10

    const rfc = this.getTextValue(data, ['rfc'])
    if (rfc) {
      points += 10
      details.push(`RFC válido: ${rfc}`)
    }

    return {
      summary: 'Declaración fiscal procesada',
      haviPoints: points,
      details
    }
  }

  private analyzeIdDocument(data: Record<string, any>): { summary: string; haviPoints: number; details: string[] } {
    const details: string[] = []
    let points = 5

    const name = this.getTextValue(data, ['nombre_completo', 'name'])
    if (name) {
      points += 5
      details.push('Identificación verificada')
    }

    return {
      summary: 'Documento de identidad procesado',
      haviPoints: points,
      details
    }
  }

  private analyzeProofOfAddress(data: Record<string, any>): { summary: string; haviPoints: number; details: string[] } {
    const details: string[] = []
    let points = 3

    const address = this.getTextValue(data, ['direccion', 'address'])
    if (address) {
      points += 2
      details.push('Domicilio verificado')
    }

    return {
      summary: 'Comprobante de domicilio procesado',
      haviPoints: points,
      details
    }
  }

  private analyzeEmploymentLetter(data: Record<string, any>): { summary: string; haviPoints: number; details: string[] } {
    const details: string[] = []
    let points = 8

    const company = this.getTextValue(data, ['empresa', 'company'])
    if (company) {
      points += 7
      details.push(`Empresa: ${company}`)
    }

    return {
      summary: 'Carta laboral procesada',
      haviPoints: points,
      details
    }
  }

  private getNumericValue(data: Record<string, any>, fields: string[]): number | null {
    for (const field of fields) {
      if (data[field]) {
        const value = typeof data[field] === 'object' ? data[field].value : data[field]
        const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''))
        if (!isNaN(num)) return num
      }
    }
    return null
  }

  private getTextValue(data: Record<string, any>, fields: string[]): string | null {
    for (const field of fields) {
      if (data[field]) {
        const value = typeof data[field] === 'object' ? data[field].value : data[field]
        if (value && String(value).trim().length > 0) return String(value).trim()
      }
    }
    return null
  }

  /**
   * Extrae texto del documento usando OCR (Tesseract) para imágenes y PDFs
   */
  private async getDocumentText(documentUpload: DocumentUpload): Promise<string | null> {
    try {
      // Descargar el archivo de S3
      const { GetObjectCommand } = await import('@aws-sdk/client-s3')

      const command = new GetObjectCommand({
        Bucket: s3Service.getBucketName(),
        Key: documentUpload.filePath
      })

      const response = await s3Service.s3Client.send(command)

      // Convertir stream a buffer
      const chunks: Buffer[] = []
      const stream = response.Body as any

      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      const fileBuffer = Buffer.concat(chunks)

      const mimeType = documentUpload.mimeType || ''
      const fileName = documentUpload.fileName || ''
      const isPdf = mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')
      const isImage = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)

      let extractedText = ''

      // Si es un PDF, primero intentar extraer texto nativo
      if (isPdf) {
        console.log('Processing PDF document...')

        try {
          const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
          const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(fileBuffer),
            useSystemFonts: true,
            verbosity: 0
          })

          const pdfDocument = await loadingTask.promise

          // Intentar extraer texto nativo
          for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum)
            const textContent = await page.getTextContent()

            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ')

            extractedText += pageText + '\n'
          }

          console.log('Native PDF text extraction - length:', extractedText.trim().length)
        } catch (pdfError) {
          console.error('Error extracting native PDF text:', pdfError)
        }

        // Si no se extrajo texto o es muy poco, usar OCR en el PDF
        if (!extractedText || extractedText.trim().length < 50) {
          console.log('PDF has no native text or very little, using OCR...')
          extractedText = await this.extractTextWithOCR(fileBuffer, 'pdf')
        }
      } else if (isImage) {
        // Para imágenes (PNG, JPG, etc), usar OCR directamente
        console.log('Processing image document with OCR...')
        extractedText = await this.extractTextWithOCR(fileBuffer, 'image')
      } else {
        console.log(`⚠️ Tipo de archivo no soportado: ${mimeType} / ${fileName}`)
        return ''
      }

      console.log('Final extracted text length:', extractedText.trim().length)
      console.log('First 500 chars:', extractedText.trim().substring(0, 500))

      if (!extractedText || extractedText.trim().length === 0) {
        console.log('No text could be extracted from document')
        return ''
      }

      return extractedText.trim()
    } catch (error) {
      console.error('Error getting document text:', error)
      return null
    }
  }

  /**
   * Extrae texto usando Tesseract OCR
   */
  private async extractTextWithOCR(fileBuffer: Buffer, fileType: 'pdf' | 'image'): Promise<string> {
    try {
      console.log('🔍 Iniciando OCR con Tesseract...')
      const Tesseract = await import('tesseract.js')

      let imagesToProcess: Buffer[] = []

      if (fileType === 'pdf') {
        console.log('📄 Convirtiendo PDF a imágenes...')
        const { pdfToPng } = await import('pdf-to-png-converter')

        const pngPages = await pdfToPng(fileBuffer, {
          outputFolder: '/tmp',
          viewportScale: 2.0
        })

        console.log(`✅ Convertidas ${pngPages.length} páginas`)
        imagesToProcess = pngPages.map((page: any) => page.content)
      } else {
        imagesToProcess = [fileBuffer]
      }

      let fullText = ''

      // Procesar cada imagen
      for (let i = 0; i < imagesToProcess.length; i++) {
        console.log(`🔍 Procesando imagen ${i + 1}/${imagesToProcess.length}...`)

        const worker = await Tesseract.createWorker('spa')
        const result = await worker.recognize(imagesToProcess[i])

        console.log(`📝 Texto extraído: ${result.data.text.length} caracteres, confianza: ${result.data.confidence}%`)

        fullText += result.data.text + '\n'
        await worker.terminate()
      }

      console.log(`✅ OCR completado: ${fullText.length} caracteres totales`)
      return fullText.trim()
    } catch (error) {
      console.error('❌ Error en OCR:', error)
      return ''
    }
  }

  /**
   * Extrae datos usando reglas de pattern matching
   */
  private async extractDataUsingRules(
    text: string,
    rules: ExtractionRule[]
  ): Promise<ExtractionResult> {
    const fields: ExtractionResult['fields'] = []
    const extractionNotes: string[] = []
    const extractedFieldNames = new Set<string>()

    for (const rule of rules) {
      // Evitar duplicados - si ya extrajimos este campo, usar la regla de mayor prioridad
      if (extractedFieldNames.has(rule.fieldName)) {
        continue
      }

      const result = rule.tryExtract(text)

      if (result.success && result.value) {
        fields.push({
          fieldName: rule.fieldName,
          fieldType: this.inferFieldType(rule.fieldName),
          extractedValue: result.value,
          confidence: result.confidence,
          extractionMethod: `regex:${rule.name}`
        })

        extractedFieldNames.add(rule.fieldName)
        extractionNotes.push(`✓ Extraído: ${rule.fieldName} con ${result.confidence}% confianza`)

        // Actualizar estadísticas de la regla
        await rule.incrementSuccess()
      } else {
        await rule.incrementFailure()
      }
    }

    // Calcular confianza general
    const overallConfidence = fields.length > 0
      ? Math.round(fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length)
      : 0

    // Determinar si necesita revisión
    const needsReview = overallConfidence < 70 || fields.length < this.getMinimumRequiredFields(rules[0]?.documentType)

    if (fields.length === 0) {
      extractionNotes.push('⚠ No se pudo extraer ningún campo automáticamente')
    }

    if (needsReview) {
      extractionNotes.push('⚠ Requiere revisión humana')
    }

    return {
      fields,
      overallConfidence,
      needsReview,
      extractionNotes
    }
  }

  /**
   * Crea una revisión para procesamiento manual
   */
  private async createReviewForManualProcessing(
    documentUpload: DocumentUpload,
    documentText: string | null
  ): Promise<void> {
    await DocumentReview.create({
      documentUploadId: documentUpload.id,
      status: 'pending',
      confidenceScore: 0,
      extractionNotes: 'No hay reglas de extracción configuradas para este tipo de documento. Requiere procesamiento manual.',
      autoExtractedData: null
    })

    documentUpload.status = 'processing'
    documentUpload.processingNotes = 'Pendiente de revisión manual - No hay reglas automáticas'
    await documentUpload.save()
  }

  /**
   * Infiere el tipo de campo basado en su nombre
   */
  private inferFieldType(fieldName: string): 'text' | 'number' | 'date' | 'currency' {
    if (fieldName.includes('date') || fieldName.includes('fecha')) return 'date'
    if (fieldName.includes('income') || fieldName.includes('balance') ||
        fieldName.includes('salary') || fieldName.includes('amount') ||
        fieldName.includes('ingreso') || fieldName.includes('saldo') ||
        fieldName.includes('salario') || fieldName.includes('monto')) return 'currency'
    if (fieldName.includes('count') || fieldName.includes('number') ||
        fieldName.includes('cantidad')) return 'number'
    return 'text'
  }

  /**
   * Obtiene el número mínimo de campos requeridos por tipo de documento
   */
  private getMinimumRequiredFields(documentType?: string): number {
    const minimums: Record<string, number> = {
      'bank_statement': 3, // balance, income, expenses
      'payroll': 2, // salary, employer
      'id_document': 3, // name, curp/rfc, address
      'tax_return': 2, // annual income, rfc
      'proof_of_address': 2, // address, name
      'employment_letter': 2 // employer, position
    }
    return minimums[documentType || ''] || 2
  }

  /**
   * Convierte array de campos a objeto
   */
  private fieldsToObject(fields: ExtractionResult['fields']): Record<string, any> {
    const obj: Record<string, any> = {}
    for (const field of fields) {
      obj[field.fieldName] = {
        value: field.extractedValue,
        confidence: field.confidence,
        method: field.extractionMethod
      }
    }
    return obj
  }

  /**
   * Re-procesa un documento con nuevas reglas o después de corrección humana
   */
  async reprocessDocument(documentUpload: DocumentUpload): Promise<void> {
    // Eliminar campos anteriores
    const oldFields = await DocumentField.query()
      .where('document_upload_id', documentUpload.id)

    for (const field of oldFields) {
      await field.delete()
    }

    // Eliminar review anterior
    const oldReview = await DocumentReview.query()
      .where('document_upload_id', documentUpload.id)
      .first()

    if (oldReview) {
      await oldReview.delete()
    }

    // Procesar de nuevo
    await this.processDocument(documentUpload)
  }
}

export const documentExtractionService = new DocumentExtractionService()

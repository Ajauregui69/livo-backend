import OpenAI from 'openai'
import env from '#start/env'
import DocumentUpload from '#models/document_upload'
import { s3Service } from '#services/s3_service'

const openai = new OpenAI({
  apiKey: env.get('OPENAI_API_KEY')
})

interface VisionExtractionResult {
  fields: Record<string, any>
  analysis: {
    summary: string
    haviPoints: number
    details: string[]
  }
  confidence: number
}

export class VisionExtractionService {
  /**
   * Extrae datos de un documento usando GPT-4 Vision
   */
  async extractFromDocument(documentUpload: DocumentUpload): Promise<VisionExtractionResult> {
    console.log(`🔍 Analizando documento ${documentUpload.fileName} con GPT-4 Vision...`)

    try {
      // 1. Descargar documento de S3
      const fileBuffer = await this.downloadFromS3(documentUpload)

      // 2. Convertir a imagen si es PDF (solo primera página)
      const imageBuffer = await this.convertToImage(fileBuffer, documentUpload.mimeType)

      // 3. Convertir a base64
      const base64Image = imageBuffer.toString('base64')
      const mimeType = this.getImageMimeType(documentUpload.mimeType)

      // 4. Crear prompt según tipo de documento
      const prompt = this.createPrompt(documentUpload.documentType)

      // 5. Llamar a GPT-4 Vision
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })

      // 6. Parsear respuesta JSON
      const result = JSON.parse(response.choices[0].message.content || '{}')

      console.log(`✅ Datos extraídos por Vision AI:`, result)

      return result
    } catch (error) {
      console.error('Error en Vision AI:', error)
      throw error
    }
  }

  /**
   * Descarga archivo de S3
   */
  private async downloadFromS3(documentUpload: DocumentUpload): Promise<Buffer> {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3')

    const command = new GetObjectCommand({
      Bucket: s3Service.getBucketName(),
      Key: documentUpload.filePath
    })

    const response = await s3Service.s3Client.send(command)
    const chunks: Buffer[] = []
    const stream = response.Body as any

    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    return Buffer.concat(chunks)
  }

  /**
   * Convierte PDF a imagen o retorna la imagen directamente
   */
  private async convertToImage(fileBuffer: Buffer, mimeType: string | null): Promise<Buffer> {
    if (mimeType === 'application/pdf') {
      // Convertir primera página de PDF a imagen
      const { pdfToPng } = await import('pdf-to-png-converter')

      const pngPages = await pdfToPng(fileBuffer, {
        outputFolder: '/tmp',
        viewportScale: 2.0,
        pagesToProcess: [1] // Solo primera página
      })

      if (pngPages.length === 0) {
        throw new Error('No se pudo convertir PDF a imagen')
      }

      return pngPages[0].content
    } else {
      // Ya es una imagen
      return fileBuffer
    }
  }

  /**
   * Determina el MIME type de la imagen
   */
  private getImageMimeType(originalMime: string | null): string {
    if (originalMime?.includes('jpeg') || originalMime?.includes('jpg')) {
      return 'image/jpeg'
    }
    if (originalMime?.includes('png')) {
      return 'image/png'
    }
    // Default para PDFs convertidos
    return 'image/png'
  }

  /**
   * Crea el prompt específico para cada tipo de documento
   */
  private createPrompt(docType: string): string {
    const basePrompt = `Analiza esta imagen de un documento financiero mexicano y extrae la información relevante.

IMPORTANTE: Responde SOLO con un objeto JSON válido, sin markdown, sin explicaciones adicionales.`

    const prompts: Record<string, string> = {
      bank_statement: `${basePrompt}

Tipo de documento: Estado de Cuenta Bancario

Extrae:
1. saldo_actual: El saldo disponible o actual en pesos mexicanos (solo número)
2. ingreso_mensual: Ingresos o depósitos mensuales promedio (solo número)
3. gastos_mensuales: Gastos o retiros mensuales promedio (solo número)
4. banco: Nombre del banco
5. titular: Nombre del titular de la cuenta

Formato de respuesta JSON:
{
  "fields": {
    "saldo_actual": { "value": "50000", "confidence": 95 },
    "ingreso_mensual": { "value": "25000", "confidence": 90 },
    "gastos_mensuales": { "value": "18000", "confidence": 85 },
    "banco": { "value": "Scotiabank", "confidence": 100 },
    "titular": { "value": "JUAN PEREZ", "confidence": 95 }
  },
  "analysis": {
    "summary": "Estado de cuenta de Scotiabank con saldo de $50,000",
    "haviPoints": 30,
    "details": ["Buen saldo bancario", "Capacidad de ahorro del 28%"]
  },
  "confidence": 90
}`,

      payroll: `${basePrompt}

Tipo de documento: Recibo de Nómina

Extrae:
1. salario_neto: Salario neto después de deducciones (solo número)
2. salario_bruto: Salario bruto antes de deducciones (solo número)
3. empresa: Nombre de la empresa empleadora
4. puesto: Puesto o cargo
5. periodo: Periodo de pago

Formato de respuesta JSON:
{
  "fields": {
    "salario_neto": { "value": "18000", "confidence": 95 },
    "salario_bruto": { "value": "25000", "confidence": 95 },
    "empresa": { "value": "ACME Corp", "confidence": 90 },
    "puesto": { "value": "Ingeniero", "confidence": 85 }
  },
  "analysis": {
    "summary": "Nómina de ACME Corp con salario neto de $18,000",
    "haviPoints": 18,
    "details": ["Salario formal", "Con prestaciones"]
  },
  "confidence": 92
}`,

      id_document: `${basePrompt}

Tipo de documento: Identificación Oficial (INE/IFE)

Extrae:
1. nombre_completo: Nombre completo
2. fecha_nacimiento: Fecha de nacimiento (DD/MM/YYYY)
3. curp: CURP si está visible
4. vigencia: Año de vigencia

Formato de respuesta JSON:
{
  "fields": {
    "nombre_completo": { "value": "JUAN PEREZ GARCIA", "confidence": 98 },
    "fecha_nacimiento": { "value": "15/05/1985", "confidence": 95 }
  },
  "analysis": {
    "summary": "INE vigente",
    "haviPoints": 10,
    "details": ["Documento legible", "Datos claros"]
  },
  "confidence": 96
}`,

      proof_of_address: `${basePrompt}

Tipo de documento: Comprobante de Domicilio

Extrae:
1. titular: Nombre del titular del servicio
2. direccion: Dirección completa
3. tipo_servicio: Tipo de servicio (luz, agua, teléfono, etc)
4. fecha_emision: Fecha de emisión

Formato de respuesta JSON:
{
  "fields": {
    "titular": { "value": "JUAN PEREZ", "confidence": 95 },
    "direccion": { "value": "Calle Principal 123, Col. Centro", "confidence": 90 },
    "tipo_servicio": { "value": "CFE - Electricidad", "confidence": 100 }
  },
  "analysis": {
    "summary": "Comprobante CFE vigente",
    "haviPoints": 5,
    "details": ["Domicilio verificable"]
  },
  "confidence": 93
}`,

      tax_return: `${basePrompt}

Tipo de documento: Declaración Fiscal / Constancia SAT

Extrae:
1. rfc: RFC del contribuyente
2. nombre: Nombre o razón social
3. ingresos_anuales: Ingresos anuales declarados (solo número)
4. regimen: Régimen fiscal

Formato de respuesta JSON:
{
  "fields": {
    "rfc": { "value": "PEGJ850515ABC", "confidence": 98 },
    "nombre": { "value": "JUAN PEREZ GARCIA", "confidence": 95 },
    "ingresos_anuales": { "value": "350000", "confidence": 85 }
  },
  "analysis": {
    "summary": "Declaración fiscal con ingresos de $350,000 anuales",
    "haviPoints": 15,
    "details": ["RFC válido", "Ingresos declarados"]
  },
  "confidence": 90
}`,

      employment_letter: `${basePrompt}

Tipo de documento: Carta Laboral

Extrae:
1. empresa: Nombre de la empresa
2. puesto: Puesto del empleado
3. salario_mensual: Salario mensual mencionado (solo número)
4. antiguedad: Antigüedad laboral
5. fecha_carta: Fecha de la carta

Formato de respuesta JSON:
{
  "fields": {
    "empresa": { "value": "ACME Corporation", "confidence": 95 },
    "puesto": { "value": "Gerente de Ventas", "confidence": 90 },
    "salario_mensual": { "value": "22000", "confidence": 85 }
  },
  "analysis": {
    "summary": "Carta laboral de ACME Corp",
    "haviPoints": 12,
    "details": ["Empleo formal verificable"]
  },
  "confidence": 88
}`
    }

    return prompts[docType] || prompts.bank_statement
  }
}

// Export singleton
export const visionExtractionService = new VisionExtractionService()

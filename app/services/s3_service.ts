import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import env from '#start/env'
import { cuid } from '@adonisjs/core/helpers'
import { MultipartFile } from '@adonisjs/core/bodyparser'

export class S3Service {
  public s3Client: S3Client
  private bucketName: string
  private isDevelopment: boolean

  constructor() {
    this.s3Client = new S3Client({
      region: env.get('AWS_REGION'),
      credentials: {
        accessKeyId: env.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: env.get('AWS_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: true, // Usar path-style porque el bucket tiene punto en el nombre
    })
    this.bucketName = env.get('AWS_S3_BUCKET')
    this.isDevelopment = env.get('NODE_ENV') === 'development'
  }

  getBucketName(): string {
    return this.bucketName
  }

  /**
   * Get base URL for files based on environment
   */
  private getBaseUrl(): string {
    if (this.isDevelopment) {
      // En desarrollo, usar localhost
      return `http://localhost:3333/api/s3-proxy`
    }
    // En producción, usar path-style S3 URL
    return `https://s3.${env.get('AWS_REGION')}.amazonaws.com/${this.bucketName}`
  }

  /**
   * Upload a file to S3 (for public access - properties, etc.)
   */
  async uploadFile(file: MultipartFile, folder: string = 'public/uploads'): Promise<{
    key: string
    url: string
    fileName: string
  }> {
    // Generate unique filename
    const fileName = `${cuid()}.${file.extname}`
    const key = `${folder}/${fileName}`

    // Read file content from tmpPath
    const fs = await import('node:fs/promises')
    const fileContent = await fs.readFile(file.tmpPath!)

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: fileContent,
      ContentType: file.type,
      // Files in 'public/' folder should be accessible via bucket policy
    })

    await this.s3Client.send(command)

    // Construct public URL based on environment
    const url = this.isDevelopment
      ? `${this.getBaseUrl()}/${key}`
      : `https://s3.${env.get('AWS_REGION')}.amazonaws.com/${this.bucketName}/${key}`

    return {
      key,
      url,
      fileName: file.clientName || fileName,
    }
  }

  /**
   * Upload a private file to S3 (for documents, sensitive data)
   * These files require signed URLs to access
   */
  async uploadPrivateFile(file: MultipartFile, folder: string = 'private/documents'): Promise<{
    key: string
    fileName: string
  }> {
    // Generate unique filename
    const fileName = `${cuid()}.${file.extname}`
    const key = `${folder}/${fileName}`

    // Read file content from tmpPath
    const fs = await import('node:fs/promises')
    const fileContent = await fs.readFile(file.tmpPath!)

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: fileContent,
      ContentType: file.type,
      ACL: 'public-read', // Hacer el archivo público para lectura
    })

    await this.s3Client.send(command)

    return {
      key,
      fileName: file.clientName || fileName,
    }
  }

  /**
   * Upload file buffer to S3
   */
  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    folder: string = 'uploads'
  ): Promise<{
    key: string
    url: string
    fileName: string
  }> {
    const key = `${folder}/${fileName}`

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      // ACL removed - bucket uses default permissions
    })

    await this.s3Client.send(command)

    // Use URL based on environment
    const url = this.isDevelopment
      ? `${this.getBaseUrl()}/${key}`
      : `https://s3.${env.get('AWS_REGION')}.amazonaws.com/${this.bucketName}/${key}`

    return {
      key,
      url,
      fileName,
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    await this.s3Client.send(command)
  }

  /**
   * Get a signed URL for private file access
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    // Usar path-style ya que el bucket tiene un punto en el nombre
    return await getSignedUrl(this.s3Client, command, { expiresIn })
  }

  /**
   * Get public URL for a file
   * NOTA: Si el bucket está completamente privado, esto generará una URL firmada en su lugar
   */
  async getPublicUrl(key: string): Promise<string> {
    // Si es un archivo en la carpeta public, usar URL directa
    if (key.startsWith('public/')) {
      return this.isDevelopment
        ? `${this.getBaseUrl()}/${key}`
        : `https://s3.${env.get('AWS_REGION')}.amazonaws.com/${this.bucketName}/${key}`
    }

    // Para otros archivos, generar URL firmada
    return await this.getSignedUrl(key, 86400) // 24 horas
  }
}

// Create singleton instance
export const s3Service = new S3Service()
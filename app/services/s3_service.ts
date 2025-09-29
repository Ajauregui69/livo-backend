import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import env from '#start/env'
import { cuid } from '@adonisjs/core/helpers'
import { MultipartFile } from '@adonisjs/core/bodyparser'

export class S3Service {
  private s3Client: S3Client
  private bucketName: string

  constructor() {
    this.s3Client = new S3Client({
      region: env.get('AWS_REGION'),
      credentials: {
        accessKeyId: env.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: env.get('AWS_SECRET_ACCESS_KEY'),
      },
    })
    this.bucketName = env.get('AWS_S3_BUCKET')
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(file: MultipartFile, folder: string = 'uploads'): Promise<{
    key: string
    url: string
    fileName: string
  }> {
    // Generate unique filename
    const fileName = `${cuid()}.${file.extname}`
    const key = `${folder}/${fileName}`

    // Read file content
    const fileContent = await file.read()

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: fileContent,
      ContentType: file.type,
      ACL: 'public-read', // Make files publicly accessible
    })

    await this.s3Client.send(command)

    // Construct public URL
    const url = `https://${this.bucketName}.s3.${env.get('AWS_REGION')}.amazonaws.com/${key}`

    return {
      key,
      url,
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
      ACL: 'public-read',
    })

    await this.s3Client.send(command)

    const url = `https://${this.bucketName}.s3.${env.get('AWS_REGION')}.amazonaws.com/${key}`

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

    return await getSignedUrl(this.s3Client, command, { expiresIn })
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    return `https://${this.bucketName}.s3.${env.get('AWS_REGION')}.amazonaws.com/${key}`
  }
}

// Create singleton instance
export const s3Service = new S3Service()
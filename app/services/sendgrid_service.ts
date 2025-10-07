class SendGridService {
  private sgMail: any
  private nodemailer: any
  private transporter: any

  constructor() {
    // Dynamic import to avoid TypeScript issues
    this.sgMail = null
    this.nodemailer = null
    this.transporter = null
  }

  private async getSendGrid() {
    if (!this.sgMail) {
      const sgModule = await import('@sendgrid/mail')
      this.sgMail = sgModule.default
      this.sgMail.setApiKey(process.env.SENDGRID_API_KEY || 'SG.dummy')
    }
    return this.sgMail
  }

  private async getBrevoTransporter() {
    if (!this.nodemailer) {
      this.nodemailer = await import('nodemailer')
      this.transporter = this.nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD,
        },
      })
    }
    return this.transporter
  }

  async sendVerificationEmail(email: string, firstName: string, token: string) {
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>¡Bienvenido a Havi.app, ${firstName}!</h2>
        <p>Gracias por registrarte en nuestra plataforma. Para completar tu registro, necesitas verificar tu dirección de correo electrónico.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verificar mi cuenta
          </a>
        </div>
        <p>Si el botón no funciona, también puedes copiar y pegar este enlace en tu navegador:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>Este enlace expirará en 24 horas por seguridad.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">
          Si no te registraste en Havi.app, puedes ignorar este correo de forma segura.
        </p>
      </div>
    `

    try {
      // En desarrollo, usar Brevo (SMTP)
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Enviando email con Brevo (SMTP) en modo desarrollo...')
        const transporter = await this.getBrevoTransporter()

        await transporter.sendMail({
          from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
          to: email,
          subject: 'Verifica tu cuenta en Havi.app',
          html: htmlContent
        })

        console.log('✅ Email enviado exitosamente con Brevo')
        return true
      }
      // En producción, usar SendGrid
      else {
        console.log('📧 Enviando email con SendGrid en modo producción...')
        const sg = await this.getSendGrid()

        const msg = {
          to: email,
          from: {
            email: process.env.MAIL_FROM_ADDRESS || 'no-reply@havi.app',
            name: process.env.MAIL_FROM_NAME || 'Havi.app'
          },
          subject: 'Verifica tu cuenta en Havi.app',
          html: htmlContent
        }

        await sg.send(msg)
        console.log('✅ Email enviado exitosamente con SendGrid')
        return true
      }
    } catch (error) {
      console.error('❌ Error al enviar email:', error)
      throw error
    }
  }

  async sendPasswordResetEmail(email: string, firstName: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hola ${firstName},</h2>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Havi.app.</p>
        <p>Si no realizaste esta solicitud, puedes ignorar este correo de forma segura.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Restablecer mi contraseña
          </a>
        </div>
        <p>Si el botón no funciona, también puedes copiar y pegar este enlace en tu navegador:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p><strong>Este enlace expirará en 1 hora por seguridad.</strong></p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">
          Por tu seguridad, todas tus sesiones activas serán cerradas una vez que establezcas tu nueva contraseña.
        </p>
      </div>
    `

    try {
      // En desarrollo, usar Brevo (SMTP)
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Enviando email de reset de contraseña con Brevo (SMTP)...')
        const transporter = await this.getBrevoTransporter()

        await transporter.sendMail({
          from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
          to: email,
          subject: 'Restablece tu contraseña en Havi.app',
          html: htmlContent
        })

        console.log('✅ Email de reset enviado exitosamente con Brevo')
        return true
      }
      // En producción, usar SendGrid
      else {
        console.log('📧 Enviando email de reset de contraseña con SendGrid...')
        const sg = await this.getSendGrid()

        const msg = {
          to: email,
          from: {
            email: process.env.MAIL_FROM_ADDRESS || 'no-reply@havi.app',
            name: process.env.MAIL_FROM_NAME || 'Havi.app'
          },
          subject: 'Restablece tu contraseña en Havi.app',
          html: htmlContent
        }

        await sg.send(msg)
        console.log('✅ Email de reset enviado exitosamente con SendGrid')
        return true
      }
    } catch (error) {
      console.error('❌ Error al enviar email de reset:', error)
      throw error
    }
  }
}

export default new SendGridService()

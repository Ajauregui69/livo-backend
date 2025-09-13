import { BaseMail } from '@adonisjs/mail'
import User from '#models/user'
import env from '#start/env'

export default class VerifyEmailMail extends BaseMail {
  from = env.get('MAIL_FROM_ADDRESS', 'noreply@livo.com')
  fromName = env.get('MAIL_FROM_NAME', 'LIVO')

  constructor(
    private user: User,
    private verificationToken: string
  ) {
    super()
  }

  /**
   * The prepare method is invoked automatically when
   * the email is sent
   */
  prepare() {
    const verificationUrl = `${env.get('FRONTEND_URL', 'http://localhost:3000')}/auth/verify-email?token=${this.verificationToken}`

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Verifica tu cuenta - LIVO</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f8f9fa; }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background: #007bff; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
          }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LIVO</h1>
          </div>
          <div class="content">
            <h2>¡Hola ${this.user.firstName}!</h2>
            <p>Gracias por registrarte en LIVO. Para completar tu registro, necesitas verificar tu dirección de correo electrónico.</p>
            <p>Haz clic en el siguiente botón para verificar tu cuenta:</p>
            <a href="${verificationUrl}" class="button">Verificar mi cuenta</a>
            <p>Si el botón no funciona, puedes copiar y pegar este enlace en tu navegador:</p>
            <p style="word-break: break-all;"><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p><strong>Este enlace expira en 24 horas.</strong></p>
            <p>Si no creaste esta cuenta, puedes ignorar este correo.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} LIVO. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `

    this
      .message.to(this.user.email)
      .subject('Verifica tu cuenta - LIVO')
      .html(htmlContent)
  }
}
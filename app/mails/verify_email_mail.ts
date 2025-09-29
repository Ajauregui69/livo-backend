import { BaseMail } from '@adonisjs/mail'
import User from '#models/user'
import env from '#start/env'

export default class VerifyEmailMail extends BaseMail {
  from = env.get('MAIL_FROM_ADDRESS', 'noreply@havi.app')
  fromName = env.get('MAIL_FROM_NAME', 'havi.app')

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
    const appName = env.get('APP_NAME', 'havi.app')
    const frontendUrl = env.get('FRONTEND_URL', 'http://localhost:3000')
    const logoUrl = `${frontendUrl}/images/logo-header.png`

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Verifica tu cuenta - ${appName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: linear-gradient(135deg, #0b2a60 0%, #1e40af 100%); color: white; padding: 40px 20px; text-align: center; }
          .logo { max-width: 200px; height: auto; margin-bottom: 20px; }
          .content { padding: 40px 30px; background: #f8fafc; }
          .button {
            display: inline-block;
            padding: 16px 32px;
            background: linear-gradient(135deg, #0b2a60 0%, #1e40af 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin: 25px 0;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(11, 42, 96, 0.3);
          }
          .footer { padding: 30px 20px; text-align: center; font-size: 14px; color: #64748b; background: #f1f5f9; }
          .url-box { background: #e2e8f0; padding: 15px; border-radius: 6px; margin: 20px 0; word-break: break-all; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${logoUrl}" alt="${appName}" class="logo" />
            <h1 style="margin: 0; font-size: 28px; font-weight: 300;">Verifica tu cuenta</h1>
          </div>
          <div class="content">
            <h2 style="color: #1e293b; margin-bottom: 20px;">¡Hola ${this.user.firstName}!</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">Gracias por registrarte en <strong>${appName}</strong>, tu plataforma inmobiliaria de confianza.</p>
            <p style="font-size: 16px; margin-bottom: 25px;">Para completar tu registro y activar tu cuenta, necesitas verificar tu dirección de correo electrónico haciendo clic en el botón de abajo:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" class="button">Verificar mi cuenta</a>
            </div>
            <p style="font-size: 14px; color: #64748b;">Si tienes problemas con el botón, también puedes copiar y pegar este enlace en tu navegador:</p>
            <div class="url-box">${verificationUrl}</div>
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 25px 0;">
              <p style="margin: 0; color: #92400e; font-weight: 600;">⏰ Importante: Este enlace de verificación expirará en 24 horas.</p>
            </div>
            <p style="font-size: 14px; color: #64748b;">Si no creaste esta cuenta, puedes ignorar este correo electrónico.</p>
          </div>
          <div class="footer">
            <p style="margin: 0;">© ${new Date().getFullYear()} ${appName}. Todos los derechos reservados.</p>
            <p style="margin: 10px 0 0 0;">Plataforma Inmobiliaria | <a href="${frontendUrl}" style="color: #0b2a60; text-decoration: none;">${frontendUrl}</a></p>
          </div>
        </div>
      </body>
      </html>
    `

    this
      .message.to(this.user.email)
      .subject(`Verifica tu cuenta - ${appName}`)
      .html(htmlContent)
  }
}
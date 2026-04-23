import transporter, { isEmailEnabled } from "../../config/email.js"

const FRONTEND_URL = process.env.CLIENT_URL || "http://localhost:5173"
const APP_NAME = "CoDesign LIVE"

export const sendPasswordResetEmail = async (email, resetToken, userId) => {
  try {
    if (!isEmailEnabled() || !transporter) {
      console.warn(`[Email] Email service not configured, skipping password reset email for ${email}`)
      return false
    }

    const resetLink = `${FRONTEND_URL}/auth/reset/${userId}/${resetToken}`

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: `${APP_NAME} - Restablecer Contraseña`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; color: #2563eb; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { color: #555; line-height: 1.6; margin: 20px 0; }
            .reset-button {
              display: inline-block;
              background-color: #2563eb;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: bold;
            }
            .reset-button:hover { background-color: #1d4ed8; }
            .warning {
              background-color: #fffbea;
              border-left: 4px solid #f59e0b;
              padding: 12px;
              margin: 20px 0;
              color: #92400e;
            }
            .footer {
              border-top: 1px solid #e5e5e5;
              margin-top: 20px;
              padding-top: 20px;
              text-align: center;
              color: #999;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 ${APP_NAME}</h1>
            </div>

            <div class="content">
              <p>¡Hola!</p>

              <p>Recibimos una solicitud para restablecer tu contraseña. Si fuiste tú, usa el botón de abajo para crear una nueva contraseña.</p>

              <center>
                <a href="${resetLink}" class="reset-button" style="color: #ffffff !important; text-decoration: none;">Restablecer Contraseña</a>
              </center>

              <p>O copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">
                ${resetLink}
              </p>

              <div class="warning">
                <strong>⚠️ Este enlace expirará en 1 hora por razones de seguridad.</strong>
                <p style="margin: 10px 0 0 0; font-size: 13px;">Si no solicitaste un reset de contraseña, ignora este email. Tu cuenta permanece segura.</p>
              </div>

              <p><strong>Consejos de seguridad:</strong></p>
              <ul style="color: #666;">
                <li>Nunca compartas este enlace con otras personas</li>
                <li>Usa una contraseña fuerte (mínimo 8 caracteres)</li>
                <li>Evita reutilizar contraseñas de otros sitios</li>
              </ul>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} ${APP_NAME}. Todos los derechos reservados.</p>
              <p>Si tienes preguntas, contáctanos en soporte@codesign-live.com</p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    const info = await transporter.sendMail(mailOptions)
    console.log(`[Email] Password reset sent to ${email} (Message ID: ${info.messageId.split("@")[0]}...)`)
    return true
  } catch (error) {
    console.error(`[Email Error] Failed to send reset email to ${email}:`, error.message)
    throw error
  }
}

export const sendPasswordResetConfirmationEmail = async (email, userName) => {
  try {
    if (!isEmailEnabled() || !transporter) {
      console.warn(`[Email] Email service not configured, skipping confirmation email for ${email}`)
      return false
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: `${APP_NAME} - Contraseña Actualizada`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; color: #2563eb; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { color: #555; line-height: 1.6; margin: 20px 0; }
            .success {
              background-color: #dcfce7;
              border-left: 4px solid #22c55e;
              padding: 12px;
              margin: 20px 0;
              color: #15803d;
            }
            .footer {
              border-top: 1px solid #e5e5e5;
              margin-top: 20px;
              padding-top: 20px;
              text-align: center;
              color: #999;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ ${APP_NAME}</h1>
            </div>

            <div class="content">
              <p>¡Hola ${userName}!</p>

              <div class="success">
                <strong>Tu contraseña ha sido actualizada exitosamente.</strong>
              </div>

              <p>Si no realizaste este cambio, por favor contacta con soporte inmediatamente.</p>

              <p>Ahora puedes iniciar sesión con tu nueva contraseña en:</p>
              <p><a href="${FRONTEND_URL}/login" style="color: #2563eb;">Ir a ${APP_NAME}</a></p>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} ${APP_NAME}. Todos los derechos reservados.</p>
              <p>Si tienes preguntas, contáctanos en soporte@codesign-live.com</p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    await transporter.sendMail(mailOptions)
    console.log(`[Email] Password confirmation email sent to ${email}`)
    return true
  } catch (error) {
    console.error(`[Email Error] Failed to send confirmation email to ${email}:`, error.message)
    // Don't throw - this is non-critical
    return false
  }
}

export const sendVerificationEmail = async (email, verificationToken, userId, userName) => {
  try {
    if (!isEmailEnabled() || !transporter) {
      console.warn(`[Email] Email service not configured, skipping verification email for ${email}`)
      return false
    }

    const verificationLink = `${FRONTEND_URL}/auth/verify/${userId}/${verificationToken}`

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: `${APP_NAME} - Verifica tu correo electrónico`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; color: #2563eb; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { color: #555; line-height: 1.6; margin: 20px 0; }
            .verify-button {
              display: inline-block;
              background-color: #2563eb;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: bold;
            }
            .verify-button:hover { background-color: #1d4ed8; }
            .footer {
              border-top: 1px solid #e5e5e5;
              margin-top: 20px;
              padding-top: 20px;
              text-align: center;
              color: #999;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📬 ${APP_NAME}</h1>
            </div>

            <div class="content">
              <p>¡Hola ${userName}!</p>
              <p>Gracias por registrarte en ${APP_NAME}. Para activar tu cuenta y poder ingresar, debes verificar tu dirección de correo electrónico.</p>
              
              <center>
                <a href="${verificationLink}" class="verify-button" style="color: #ffffff !important; text-decoration: none;">Verificar mi correo</a>
              </center>

              <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">
                ${verificationLink}
              </p>

              <p>Este enlace expirará en 24 horas.</p>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} ${APP_NAME}. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    const info = await transporter.sendMail(mailOptions)
    console.log(`[Email] Verification email sent to ${email} (Message ID: ${info.messageId.split("@")[0]}...)`)
    return true
  } catch (error) {
    console.error(`[Email Error] Failed to send verification email to ${email}:`, error.message)
    throw error
  }
}


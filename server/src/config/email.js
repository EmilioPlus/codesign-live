import nodemailer from "nodemailer"

// Email configuration - Gmail SMTP
// Requires: EMAIL_USER, EMAIL_PASSWORD (App Password, not regular Gmail password)
const EMAIL_USER = process.env.EMAIL_USER
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD

// Internal flag — updated after async verification
let _emailEnabled = false
let transporter = null

/**
 * Returns whether the email service has credentials configured.
 */
export function isEmailEnabled() {
  return transporter !== null
}

if (!EMAIL_USER || !EMAIL_PASSWORD) {
  console.warn("\n" + "=".repeat(70))
  console.warn("WARNING: Email credentials not configured!")
  console.warn("Features requiring email (password reset) will not work.")
  console.warn("To enable email support, set these environment variables:")
  console.warn("  - EMAIL_USER: your-email@gmail.com")
  console.warn("  - EMAIL_PASSWORD: your-app-specific-password (16 chars from Google)")
  console.warn("\nGet your App Password from:")
  console.warn("  https://myaccount.google.com/apppasswords")
  console.warn("=".repeat(70) + "\n")
} else {
  // Create Nodemailer transporter for Gmail
  // NOTE: Use explicit host/port + family:4 to force IPv4.
  // Render Free tier blocks outbound IPv6 (ENETUNREACH on port 465),
  // so 'service: gmail' fails because it resolves to an IPv6 address.
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // TLS via STARTTLS on port 587
    family: 4,     // Force IPv4 — required on Render Free tier
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD
    }
  })

  // Verify connection — using a Promise so callers know the outcome
  transporter.verify()
    .then(() => {
      _emailEnabled = true
      console.log("✓ Email service ready (Gmail)")
    })
    .catch((error) => {
      _emailEnabled = false
      console.warn("\n" + "=".repeat(70))
      console.warn("WARNING: Email transporter could not be verified:")
      console.warn(error.message)
      console.warn("Check your EMAIL_USER and EMAIL_PASSWORD in .env")
      console.warn("=".repeat(70) + "\n")
    })
}

export default transporter
// Keep backward-compat export but prefer isEmailEnabled()
export { _emailEnabled as emailEnabled }

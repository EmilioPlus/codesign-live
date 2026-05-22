import { Resend } from "resend"

// Resend API Key — set RESEND_API_KEY in your environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY

let resend = null

if (!RESEND_API_KEY) {
  console.warn("\n" + "=".repeat(70))
  console.warn("WARNING: Resend API key not configured!")
  console.warn("Features requiring email (password reset, verification) will not work.")
  console.warn("To enable email support, set this environment variable:")
  console.warn("  - RESEND_API_KEY: your Resend API key (re_xxxxxxxx...)")
  console.warn("\nGet your API key from: https://resend.com/api-keys")
  console.warn("=".repeat(70) + "\n")
} else {
  resend = new Resend(RESEND_API_KEY)
  console.log("✓ Resend email client initialized")
}

/**
 * Returns whether the email service has credentials configured.
 */
export function isEmailEnabled() {
  return resend !== null
}

export default resend

// This file MUST be imported FIRST in index.js to load environment variables
// before any other modules are imported
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, "../../.env") })

console.log("[Env] Environment variables loaded")

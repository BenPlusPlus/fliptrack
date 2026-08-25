import { existsSync } from 'node:fs'
import path from 'node:path'

const skip = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test'

if (!skip) {
  let envPath = path.resolve(process.cwd(), '.env')
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath)
  }
}

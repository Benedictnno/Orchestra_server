import Groq from 'groq-sdk'

// Singleton instance to prevent multiple client initializations
let groqInstance = null

export function getGroqClient() {
  if (!groqInstance) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is missing from environment variables')
    }
    groqInstance = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groqInstance
}

export const MODELS = {
  PREMIUM: 'llama-3.3-70b-versatile',
  FAST:    'llama-3.1-8b-instant',
}

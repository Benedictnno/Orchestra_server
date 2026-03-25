import Insight from '../db/models/Insight.js'
import { generateInsight } from '../services/insights.js'

// GET /api/insights  — returns latest cached insight, generates a new one if stale
export async function getInsights(req, res) {
  // Return last cached insight (within 24 h) or stub
  const latest = await Insight.findOne({ userId: req.user._id }).sort({ generatedAt: -1 })
  if (latest) return res.json({ insight: latest })

  // TODO: call insights service (OpenAI) to generate and cache
  res.json({ message: 'No insights yet. POST /api/insights/generate to generate.' })
}

// POST /api/insights/generate
export async function generateInsights(req, res) {
  const insight = await generateInsight(req.user._id)
  res.json({ insight })
}

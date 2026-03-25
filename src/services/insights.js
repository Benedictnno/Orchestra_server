/**
 * AI Insights Service
 * Calls OpenAI to generate spending summaries and recommendations.
 * Caches results in the Insight collection.
 */
import OpenAI from 'openai'
import { subDays, format } from 'date-fns'
import Transaction from '../db/models/Transaction.js'
import Insight from '../db/models/Insight.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const CACHE_HOURS = 24

/**
 * Generate and cache an insight for a user.
 * @param {string} userId
 * @returns {Insight}
 */
export async function generateInsight(userId) {
  // Check for fresh cached insight
  const cutoff = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000)
  const cached = await Insight.findOne({ userId, generatedAt: { $gte: cutoff } })
    .sort({ generatedAt: -1 })
  if (cached) return cached

  // Fetch last 30 days of transactions
  const from = subDays(new Date(), 30)
  const transactions = await Transaction.find({
    userId,
    transactionDate: { $gte: from },
  })

  if (!transactions.length) {
    return Insight.create({
      userId,
      summary: 'No transactions in the last 30 days.',
      insights: [],
      recommendations: [],
      anomalies: [],
      totalSpent: 0,
    })
  }

  const totalSpent = transactions.reduce((s, t) => s + t.amount, 0)

  const byCategory = transactions.reduce((acc, t) => {
    const cat = t.category || 'other'
    acc[cat] = (acc[cat] || 0) + t.amount
    return acc
  }, {})

  const anomalies = transactions.filter((t) => t.isAnomaly).map((t) => t.anomalyReason)

  const prompt = `
You are a personal finance AI for a Nigerian banking app.
Analyse the following spending data for the last 30 days and respond in JSON only.

Total spent: ₦${(totalSpent / 100).toFixed(2)}
By category (in ₦): ${JSON.stringify(Object.fromEntries(
    Object.entries(byCategory).map(([k, v]) => [k, (v / 100).toFixed(2)])
  ))}
Flagged anomalies: ${anomalies.length ? anomalies.join('; ') : 'none'}

Respond with this exact JSON shape (no markdown):
{
  "summary": "<2-sentence overview>",
  "insights": ["<insight 1>", "<insight 2>", "<insight 3>"],
  "recommendations": ["<rec 1>", "<rec 2>", "<rec 3>"],
  "savingsOpportunity": <number in NGN, integer>
}
`.trim()

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  })

  let parsed = {}
  try {
    parsed = JSON.parse(completion.choices[0].message.content)
  } catch {
    parsed = { summary: 'Could not parse AI response.', insights: [], recommendations: [] }
  }

  return Insight.create({
    userId,
    summary:            parsed.summary,
    insights:           parsed.insights || [],
    recommendations:    parsed.recommendations || [],
    anomalies,
    savingsOpportunity: parsed.savingsOpportunity,
    byCategory,
    totalSpent,
  })
}

import OpenAI from 'openai'
import Insight from '../db/models/Insight.js'
import { getSpendingSummary } from '../services/insights.js'

export async function getInsights(req, res) {
  // Return cached insights if less than 24 hours old
  const cached = await Insight.findOne({ userId: req.user._id }).sort({ generatedAt: -1 })
  if (cached && Date.now() - cached.generatedAt < 24 * 60 * 60 * 1000) {
    return res.json({ insights: cached, fromCache: true })
  }

  const summary = await getSpendingSummary(req.user._id, 30)

  const prompt = `
    You are a personal financial advisor for a Nigerian user. Analyze their spending:
    Total spent (last 30 days): NGN ${(summary.totalSpent / 100).toLocaleString()}
    By category: ${JSON.stringify(
      Object.fromEntries(
        Object.entries(summary.byCategory).map(([k,v]) => [k, 'NGN ' + (v/100).toLocaleString()])
      )
    )}
    Top merchants: ${summary.topMerchants.map(([m,v]) => m + ': NGN ' + (v/100).toLocaleString()).join(', ')}
    Subscription spend: NGN ${(summary.subscriptionSpend / 100).toLocaleString()}
    Anomalous transactions flagged: ${summary.anomalyCount}

    Return a JSON object with exactly these keys:
    - summary: string, 2-sentence overview of financial health
    - insights: array of 3 specific observations about spending patterns
    - recommendations: array of 3 actionable tips tailored to this user
    - anomalies: array of strings describing unusual patterns (empty array if none)
    - savingsOpportunity: number, estimated monthly savings in NGN
    - financialScore: number between 0-100 representing overall financial health
  `

  const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const response = await openai.chat.completions.create({
    model:           'gpt-4o-mini',
    messages:        [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  })

  const result  = JSON.parse(response.choices[0].message.content)
  const insight = await Insight.create({
    userId:     req.user._id,
    ...result,
    byCategory: summary.byCategory,
    totalSpent: summary.totalSpent,
  })

  res.json({ insights: insight, fromCache: false })
}

export async function getSavings(req, res) {
  const { adjustments } = req.body

  const summary        = await getSpendingSummary(req.user._id, 30)
  const currentMonthly = summary.totalSpent
  let projectedMonthly = currentMonthly

  for (const [category, multiplier] of Object.entries(adjustments || {})) {
    const current    = summary.byCategory[category] || 0
    projectedMonthly = projectedMonthly - current + (current * multiplier)
  }

  const monthlySavings = currentMonthly - projectedMonthly

  res.json({
    currentMonthly,
    projectedMonthly,
    monthlySavings,
    annualSavings: monthlySavings * 12,
    breakdown: Object.fromEntries(
      Object.entries(adjustments || {}).map(([cat, mult]) => [cat, {
        current:   summary.byCategory[cat] || 0,
        projected: (summary.byCategory[cat] || 0) * mult,
        saving:    (summary.byCategory[cat] || 0) * (1 - mult),
      }])
    )
  })
}

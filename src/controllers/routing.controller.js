import RoutingRule from '../db/models/RoutingRule.js'
import { resolvePayment } from '../services/routing.js'
import { detectAnomalies } from '../services/anomaly.js'

export async function getRule(req, res) {
  const rule = await RoutingRule.findOne({ userId: req.user._id })
    .populate('primaryCardId cardOrder')
  res.json({ rule })
}

export async function updateRule(req, res) {
  const { mode, primaryCardId, cardOrder } = req.body
  const rule = await RoutingRule.findOneAndUpdate(
    { userId: req.user._id },
    { mode, primaryCardId, cardOrder },
    { upsert: true, new: true, runValidators: true }
  )
  res.json({ rule })
}

export async function simulate(req, res) {
  const { amount, merchant, category } = req.body

  const result = await resolvePayment(req.user._id, amount)
  if (!result.success) return res.status(400).json(result)

  const anomaly = await detectAnomalies(req.user._id, amount, merchant, category)

  res.json({
    ...result,
    merchant,
    category,
    anomaly,
    steps: result.allocations.map((a, i) => ({
      step:        i + 1,
      cardLabel:   a.card.label,
      bank:        a.card.bank,
      cardProgram: a.card.cardProgram,
      charged:     a.charge,
      remaining:   a.remaining,
    }))
  })
}

// Keep upsertRule around if routes use it
export const upsertRule = updateRule

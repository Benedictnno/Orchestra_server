import RoutingRule from '../db/models/RoutingRule.js'
import { resolveRouting } from '../services/routing.js'

// GET /api/routing
export async function getRule(req, res) {
  const rule = await RoutingRule.findOne({ userId: req.user._id }).populate('primaryCardId cardOrder')
  res.json({ rule: rule || null })
}

// PUT /api/routing
export async function upsertRule(req, res) {
  const rule = await RoutingRule.findOneAndUpdate(
    { userId: req.user._id },
    { ...req.body, userId: req.user._id },
    { upsert: true, new: true, runValidators: true }
  )
  res.json({ rule })
}

// POST /api/routing/simulate
export async function simulate(req, res) {
  const { amount } = req.body
  const result = await resolveRouting(req.user._id, amount)
  res.json({ simulation: result })
}

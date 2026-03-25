import { randomUUID } from 'crypto'
import Transaction from '../db/models/Transaction.js'
import Card from '../db/models/Card.js'
import { resolvePayment } from '../services/routing.js'
import { detectAnomalies } from '../services/anomaly.js'

// GET /api/transactions
export async function getTransactions(req, res) {
  const { cardId, category, from, to, limit = 50, page = 1 } = req.query
  const filter = { userId: req.user._id }

  if (cardId) filter.cardId = cardId
  if (category) filter.category = category
  if (from || to) {
    filter.transactionDate = {}
    if (from) filter.transactionDate.$gte = new Date(from)
    if (to) filter.transactionDate.$lte = new Date(to)
  }

  const skip = (Number(page) - 1) * Number(limit)
  const [transactions, total] = await Promise.all([
    Transaction.find(filter).sort({ transactionDate: -1 }).skip(skip).limit(Number(limit)),
    Transaction.countDocuments(filter),
  ])

  res.json({ transactions, total, page: Number(page), limit: Number(limit) })
}

// GET /api/transactions/:id
export async function getTransaction(req, res) {
  const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id })
  if (!tx) return res.status(404).json({ error: 'Transaction not found' })
  res.json({ transaction: tx })
}

// POST /api/transactions
export async function createTransaction(req, res) {
  const { amount, merchant, merchantCategory, category, narration, transactionDate, cardId } = req.body
  let resolvedPrimary, resolvedSplits

  // 1. Determine which card(s) should be charged
  if (cardId) {
    const card = await Card.findOne({ _id: cardId, userId: req.user._id })
    if (!card) return res.status(404).json({ error: 'Card not found' })
    resolvedPrimary = card
    resolvedSplits = []
  } else {
    const routingResult = await resolvePayment(req.user._id, amount)
    if (!routingResult.success) return res.status(400).json({ error: routingResult.reason })
    resolvedPrimary = routingResult.allocations[0].card
    resolvedSplits = routingResult.allocations
  }

  // 2. Check if transaction amount is unusually high for the category
  const anomaly = await detectAnomalies(req.user._id, amount, merchant, category || 'other')
  const isAnomaly = !!anomaly
  const reason = anomaly ? anomaly.reasons.join(', ') : undefined

  // 3. Save the transaction record
  const splitData = resolvedSplits.map(s => ({ cardId: s.card._id, amount: s.charge || s.amount }))
  
  const transaction = await Transaction.create({
    pan: resolvedPrimary.pan,
    cardId: resolvedPrimary._id,
    userId: req.user._id,
    amount,
    currency: 'NGN',
    merchant,
    merchantCategory,
    category,
    narration,
    transactionDate: transactionDate || new Date(),
    reference: randomUUID(),
    isAnomaly,
    anomalyReason: reason,
    simulatedSplit: splitData,
  })

  res.status(201).json({ transaction })
}

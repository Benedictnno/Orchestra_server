import Card from '../db/models/Card.js'
import CardBalance from '../db/models/CardBalance.js'
import { fetchBalance } from '../services/card360.js'

// GET /api/cards
export async function getCards(req, res) {
  const cards = await Card.find({ userId: req.user._id })
  res.json({ cards })
}

// POST /api/cards
export async function addCard(req, res) {
  const card = await Card.create({ ...req.body, userId: req.user._id })
  res.status(201).json({ card })
}

// GET /api/cards/:id
export async function getCard(req, res) {
  const card = await Card.findOne({ _id: req.params.id, userId: req.user._id })
  if (!card) return res.status(404).json({ error: 'Card not found' })
  res.json({ card })
}

// PATCH /api/cards/:id
export async function updateCard(req, res) {
  const card = await Card.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true, runValidators: true }
  )
  if (!card) return res.status(404).json({ error: 'Card not found' })
  res.json({ card })
}

// DELETE /api/cards/:id
export async function deleteCard(req, res) {
  const card = await Card.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
  if (!card) return res.status(404).json({ error: 'Card not found' })
  res.json({ message: 'Card removed' })
}

// GET /api/cards/:id/balance
export async function getCardBalance(req, res) {
  const card = await Card.findOne({ _id: req.params.id, userId: req.user._id })
  if (!card) return res.status(404).json({ error: 'Card not found' })

  // Fetch from Card360 (returns mock if CARD360_ENABLED=false)
  const data = await fetchBalance(card.pan)
  
  // Save balance snapshot
  const balance = await CardBalance.create({
    pan: card.pan,
    availableBalance: data.availableBalance,
    ledgerBalance: data.ledgerBalance,
    currency: data.currency,
    responseCode: data.responseCode,
    responseDescription: data.responseDescription,
    cardId: card._id,
  })

  res.json({ balance })
}

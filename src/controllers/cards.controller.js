import Card from '../db/models/Card.js'
import CardBalance from '../db/models/CardBalance.js'
import { card360 } from '../services/card360.js'

export async function getCards(req, res) {
  const cards = await Card.find({ userId: req.user._id })

  const withBalances = await Promise.all(cards.map(async (card) => {
    // Check for a recent balance (< 5 minutes old)
    const cached = await CardBalance.findOne({
      pan: card.pan,
      fetchedAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    }).sort({ fetchedAt: -1 })

    const bal = cached ? {
      availableBalance: cached.availableBalance,
      ledgerBalance: cached.ledgerBalance,
      currency: cached.currency
    } : await card360.getBalance(card.pan, card.cardType).then(async (res) => {
      // Save for next time if it was a successful live fetch
      if (res.availableBalance !== undefined) {
        await CardBalance.create({
          pan: card.pan,
          cardId: card._id,
          availableBalance: res.availableBalance,
          ledgerBalance: res.ledgerBalance,
          currency: res.currency || 'NGN',
          responseCode: res.code || '00',
          responseDescription: res.description || 'Successful'
        })
      }
      return res
    })

    return {
      ...card.toObject(),
      availableBalance: bal.availableBalance ?? 0,
      ledgerBalance:    bal.ledgerBalance ?? 0,
      currency:         bal.currency ?? 'NGN',
    }
  }))

  res.json({ cards: withBalances })
}

export async function addCard(req, res) {
  const { pan, expiryDate, issuerNr, cardSequenceNr,
          label, bank, color, cardType } = req.body

  // Verify card exists on Card360 (or mock)
  const c360 = await card360.fetchCard({ pan, expiryDate, issuerNr, cardSequenceNr })
  if (c360.code !== '00') {
    return res.status(400).json({ error: 'Card not found or invalid details' })
  }

  const detail = c360.cardDetails[0]
  const card   = await Card.create({
    ...detail,
    userId:   req.user._id,
    label,
    bank,
    color,
    cardType: cardType || 'debit',
  })

  res.status(201).json({ card })
}

export async function getCard(req, res) {
  const card = await Card.findOne({ _id: req.params.id, userId: req.user._id })
  if (!card) return res.status(404).json({ error: 'Card not found' })
  res.json({ card })
}

export async function updateCard(req, res) {
  const { action } = req.body   // 'block' | 'unblock'

  const card = await Card.findOne({ _id: req.params.id, userId: req.user._id })
  if (!card) return res.status(404).json({ error: 'Card not found' })

  // If no action provided, act like a standard update
  if (!action) {
    const updated = await Card.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    )
    return res.json({ card: updated })
  }

  const result = action === 'block'
    ? await card360.blockCard(card.pan, card.cardType)
    : await card360.unblockCard(card.pan, card.cardType)

  if (result.code === '00') {
    card.cardStatus = action === 'block' ? '2' : '1'
    await card.save()
  }

  res.json({ card, ...result })
}

export async function deleteCard(req, res) {
  const card = await Card.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
  if (!card) return res.status(404).json({ error: 'Card not found' })
  res.json({ message: 'Card removed' })
}

export async function getCardBalance(req, res) {
  const card = await Card.findOne({ _id: req.params.id, userId: req.user._id })
  if (!card) return res.status(404).json({ error: 'Card not found' })

  const data = await card360.getBalance(card.pan, card.cardType)
  
  const balance = await CardBalance.create({
    pan: card.pan,
    availableBalance: data.availableBalance,
    ledgerBalance: data.ledgerBalance,
    currency: data.currency,
    responseCode: data.code,
    responseDescription: data.description,
    cardId: card._id,
  })

  res.json({ balance })
}

import Card from '../db/models/Card.js'
import CardBalance from '../db/models/CardBalance.js'
import { card360 } from '../services/card360.js'

// Mask PAN to last 4 digits for all API responses
const maskPan = (pan) => pan ? `****-****-****-${pan.slice(-4)}` : null

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
      pan:              maskPan(card.pan),
      availableBalance: bal.availableBalance ?? 0,
      ledgerBalance:    bal.ledgerBalance ?? 0,
      currency:         bal.currency ?? 'NGN',
    }
  }))

  res.json({ cards: withBalances })
}

export async function addCard(req, res) {
  const { pan, expiryDate,
          label, bank, accountNumber, color, cardType } = req.body

  // Verify card exists on Card360 (or mock)
  const c360 = await card360.fetchCard({ 
    pan, 
    expiryDate, 
    issuerNr: '000001',        // Default filler as user shouldn't input this
    cardSequenceNr: '01'       // Default filler 
  })
  if (c360.code !== '00') {
    return res.status(400).json({ error: 'Card not found or invalid details' })
  }

  // Explicitly map only known Card360 fields — never spread detail directly
  // to avoid unknown fields silently overwriting our schema.
  const detail = c360.cardDetails[0]
  const card   = await Card.create({
    pan:         detail.pan,
    expiryDate:  detail.expiryDate,
    issuerNr:    detail.issuerNr,
    firstName:   detail.firstName,
    lastName:    detail.lastName,
    nameOnCard:  detail.nameOnCard,
    cardProgram: detail.cardProgram,
    customerId:  detail.customerId,
    cardStatus:  detail.cardStatus,
    seqNr:       detail.seqNr,
    userId:      req.user._id,
    label,
    bank,
    accountNumber,
    color,
    cardType:    cardType || 'debit',
  })

  const cardObj = card.toObject()
  res.status(201).json({ card: { ...cardObj, pan: maskPan(cardObj.pan) } })
}

export async function getCard(req, res) {
  const card = await Card.findOne({ _id: req.params.id, userId: req.user._id })
  if (!card) return res.status(404).json({ error: 'Card not found' })
  const cardObj = card.toObject()
  res.json({ card: { ...cardObj, pan: maskPan(cardObj.pan) } })
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
    )
    const updatedObj = updated.toObject()
    return res.json({ card: { ...updatedObj, pan: maskPan(updatedObj.pan) } })
  }

  const result = action === 'block'
    ? await card360.blockCard(card.pan, card.cardType)
    : await card360.unblockCard(card.pan, card.cardType)

  if (result.code === '00') {
    card.cardStatus = action === 'block' ? '2' : '1'
    await card.save()
  }

  const cardObj = card.toObject()
  res.json({ card: { ...cardObj, pan: maskPan(cardObj.pan) }, ...result })
}

export async function deleteCard(req, res) {
  const card = await Card.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
  if (!card) return res.status(404).json({ error: 'Card not found' })
  res.json({ message: 'Card removed' })
}

export async function getCardBalance(req, res) {
  const card = await Card.findOne({ _id: req.params.id, userId: req.user._id })
  if (!card) return res.status(404).json({ error: 'Card not found' })

  // Serve from cache if a record less than 5 minutes old exists
  const cached = await CardBalance.findOne({
    pan: card.pan,
    fetchedAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
  }).sort({ fetchedAt: -1 })

  if (cached) {
    const balObj = cached.toObject()
    return res.json({ balance: { ...balObj, pan: maskPan(balObj.pan) }, fromCache: true })
  }

  // Cache miss — call Card360 and persist the result
  const data    = await card360.getBalance(card.pan, card.cardType)
  const balance = await CardBalance.create({
    pan:                 card.pan,
    cardId:              card._id,
    availableBalance:    data.availableBalance,
    ledgerBalance:       data.ledgerBalance,
    currency:            data.currency   || 'NGN',
    responseCode:        data.code       || '00',
    responseDescription: data.description || 'Successful',
  })

  const balObj = balance.toObject()
  res.json({ balance: { ...balObj, pan: maskPan(balObj.pan) }, fromCache: false })
}

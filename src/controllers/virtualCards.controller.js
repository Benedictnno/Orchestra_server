import VirtualCard from '../db/models/VirtualCard.js'
import Card from '../db/models/Card.js'
import Transaction from '../db/models/Transaction.js'
import { card360 } from '../services/card360.js'
import { randomUUID } from 'crypto'

export async function getVirtualCards(req, res) {
  const cards = await VirtualCard.find({ userId: req.user._id })
    .populate('parentCardId', 'label bank color')
  res.json({ virtualCards: cards })
}

export async function createVirtualCard(req, res) {
  const { label, parentCardId, spendLimit, merchant, autoRenew } = req.body

  const parent = await Card.findOne({ _id: parentCardId, userId: req.user._id })
  if (!parent) return res.status(404).json({ error: 'Parent card not found' })

  const vc = await VirtualCard.create({
    userId:       req.user._id,
    parentCardId,
    label,
    merchant,
    spendLimit:   spendLimit * 100,       // Naira to kobo
    autoRenew,
    pan:          `VIRT${Date.now()}`,    // replace with Card360 PAN when live
    expiryDate:   '2712',
  })

  res.status(201).json({ virtualCard: vc })
}

export async function updateVirtualCard(req, res) {
  const { action } = req.body   // 'pause' | 'resume' | 'delete'

  const vc = await VirtualCard.findOne({ _id: req.params.id, userId: req.user._id })
  if (!vc) return res.status(404).json({ error: 'Virtual card not found' })

  if (action === 'pause')  { vc.paused = true;  vc.cardStatus = '2'; await vc.save() }
  if (action === 'resume') { vc.paused = false; vc.cardStatus = '1'; await vc.save() }
  if (action === 'delete') {
    await vc.deleteOne()
    return res.json({ success: true })   // return early — no document to echo back
  }

  // When CARD360_ENABLED=true, also call card360.blockCard/unblockCard here

  res.json({ success: true, virtualCard: vc })
}

export async function topUpVirtualCard(req, res) {
  const { amount } = req.body // amount in Naira from Zod, converted to kobo below
  const { sourceCardId } = req.body
  const amountKobo = Math.round(amount * 100)

  const vc = await VirtualCard.findOne({ _id: req.params.id, userId: req.user._id })
  if (!vc) return res.status(404).json({ error: 'Virtual card not found' })

  const sourceCard = await Card.findOne({ _id: sourceCardId, userId: req.user._id })
  if (!sourceCard) return res.status(404).json({ error: 'Source card not found' })

  // Verify source card has enough balance
  const bal = await card360.getBalance(sourceCard.pan, sourceCard.cardType)
  if (bal.availableBalance < amountKobo) {
    return res.status(400).json({ error: 'Insufficient funds on source card' })
  }

  // Update virtual card (increment its limit/allowance)
  vc.spendLimit += amountKobo
  await vc.save()

  // Record the funding transaction
  await Transaction.create({
    userId: req.user._id,
    cardId: sourceCard._id,
    pan: sourceCard.pan,
    amount: amountKobo,
    type: 'top_up',
    category: 'other',
    merchant: 'Orchestra Internal',
    narration: `Virtual Card Top-up: ${vc.label}`,
    reference: randomUUID(),
  })

  res.json({ success: true, spendLimit: vc.spendLimit })
}

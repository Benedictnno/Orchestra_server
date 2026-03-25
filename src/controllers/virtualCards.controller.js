import VirtualCard from '../db/models/VirtualCard.js'
import Card from '../db/models/Card.js'

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
  if (action === 'delete') { await vc.deleteOne() }

  // When CARD360_ENABLED=true, also call card360.blockCard/unblockCard here

  res.json({ success: true, virtualCard: vc })
}

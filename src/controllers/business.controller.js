import BusinessCard from '../db/models/BusinessCard.js'
import ApprovalRequest from '../db/models/ApprovalRequest.js'

// GET /api/business/cards
export async function getBusinessCards(req, res) {
  const cards = await BusinessCard.find({ businessUserId: req.user._id })
  res.json({ cards })
}

// POST /api/business/cards
export async function createBusinessCard(req, res) {
  const card = await BusinessCard.create({ ...req.body, businessUserId: req.user._id })
  res.status(201).json({ card })
}

// GET /api/business/cards/:id
export async function getBusinessCard(req, res) {
  const card = await BusinessCard.findOne({ _id: req.params.id, businessUserId: req.user._id })
  if (!card) return res.status(404).json({ error: 'Business card not found' })
  res.json({ card })
}

// PATCH /api/business/cards/:id
export async function updateBusinessCard(req, res) {
  const card = await BusinessCard.findOneAndUpdate(
    { _id: req.params.id, businessUserId: req.user._id },
    req.body,
    { new: true, runValidators: true }
  )
  if (!card) return res.status(404).json({ error: 'Business card not found' })
  res.json({ card })
}

// GET /api/business/approvals
export async function getApprovals(req, res) {
  // Find all business cards for this user, then fetch their approvals
  const cardIds = await BusinessCard.find({ businessUserId: req.user._id }).distinct('_id')
  const approvals = await ApprovalRequest.find({ businessCardId: { $in: cardIds } })
    .populate('businessCardId')
    .sort({ createdAt: -1 })
  res.json({ approvals })
}

// PATCH /api/business/approvals/:id
export async function reviewApproval(req, res) {
  const { status, reviewNote } = req.body
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be approved or rejected' })
  }
  const approval = await ApprovalRequest.findByIdAndUpdate(
    req.params.id,
    { status, reviewNote, reviewedBy: req.user._id, reviewedAt: new Date() },
    { new: true }
  )
  if (!approval) return res.status(404).json({ error: 'Approval request not found' })
  res.json({ approval })
}

import VirtualCard from '../db/models/VirtualCard.js'

// GET /api/virtual-cards
export async function getVirtualCards(req, res) {
  const cards = await VirtualCard.find({ userId: req.user._id })
  res.json({ cards })
}

// POST /api/virtual-cards
export async function createVirtualCard(req, res) {
  const card = await VirtualCard.create({ ...req.body, userId: req.user._id })
  res.status(201).json({ card })
}

// GET /api/virtual-cards/:id
export async function getVirtualCard(req, res) {
  const card = await VirtualCard.findOne({ _id: req.params.id, userId: req.user._id })
  if (!card) return res.status(404).json({ error: 'Virtual card not found' })
  res.json({ card })
}

// PATCH /api/virtual-cards/:id
export async function updateVirtualCard(req, res) {
  const card = await VirtualCard.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true, runValidators: true }
  )
  if (!card) return res.status(404).json({ error: 'Virtual card not found' })
  res.json({ card })
}

// DELETE /api/virtual-cards/:id
export async function deleteVirtualCard(req, res) {
  const card = await VirtualCard.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
  if (!card) return res.status(404).json({ error: 'Virtual card not found' })
  res.json({ message: 'Virtual card removed' })
}

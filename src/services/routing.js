import Card from '../db/models/Card.js'
import RoutingRule from '../db/models/RoutingRule.js'
import { card360 } from './card360.js'

export async function resolvePayment(userId, amountKobo) {
  const rule  = await RoutingRule.findOne({ userId }).populate('primaryCardId cardOrder')
  const cards = rule?.cardOrder?.length
    ? rule.cardOrder
    : await Card.find({ userId, cardStatus: '1', cardType: { $ne: 'virtual' } })
  const mode  = rule?.mode ?? 'auto-split'

  const withBalances = await Promise.all(cards.map(async (card) => {
    const bal = await card360.getBalance(card.pan, card.cardType)
    return { ...card.toObject(), available: bal.availableBalance }
  }))

  const totalAvailable = withBalances.reduce((s, c) => s + c.available, 0)
  if (totalAvailable < amountKobo) {
    return {
      success: false,
      reason: 'Insufficient funds across all cards',
      totalAvailable,
      requested: amountKobo
    }
  }

  let allocations = []

  if (mode === 'primary') {
    let remaining = amountKobo
    const primaryId = rule.primaryCardId._id.toString()
    const ordered = [
      withBalances.find(c => c._id.toString() === primaryId),
      ...withBalances.filter(c => c._id.toString() !== primaryId),
    ].filter(Boolean)
    for (const card of ordered) {
      if (remaining <= 0) break
      const charge = Math.min(card.available, remaining)
      if (charge > 0) {
        allocations.push({ card, charge, remaining: card.available - charge })
        remaining -= charge
      }
    }
  }

  if (mode === 'balanced') {
    const share = Math.ceil(amountKobo / withBalances.length)
    let remaining = amountKobo
    for (const card of withBalances) {
      if (remaining <= 0) break
      const charge = Math.min(card.available, share, remaining)
      allocations.push({ card, charge, remaining: card.available - charge })
      remaining -= charge
    }
  }

  if (mode === 'auto-split') {
    let remaining = amountKobo
    for (const card of withBalances) {
      if (remaining <= 0) break
      const charge = Math.min(card.available, remaining)
      if (charge > 0) {
        allocations.push({ card, charge, remaining: card.available - charge })
        remaining -= charge
      }
    }
  }

  return { success: true, mode, allocations, totalCharged: amountKobo }
}

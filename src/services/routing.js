/**
 * Routing Service
 * Determines which card(s) should be charged for a given transaction
 * based on the user's RoutingRule.
 */
import RoutingRule from '../db/models/RoutingRule.js'
import Card from '../db/models/Card.js'

/**
 * Resolve the card(s) to use for a transaction.
 * @param {string} userId
 * @param {number} amount  kobo
 * @returns {{ primary: Card, splits: Array<{card: Card, amount: number}> }}
 */
export async function resolveRouting(userId, amount) {
  const rule = await RoutingRule.findOne({ userId })
    .populate('primaryCardId cardOrder')

  if (!rule || rule.mode === 'primary') {
    const card = rule?.primaryCardId || await Card.findOne({ userId, isDefault: true })
    return { primary: card, splits: [] }
  }

  if (rule.mode === 'balanced') {
    // Distribute equally across all cards in order
    const cards = rule.cardOrder.filter(Boolean)
    if (!cards.length) return { primary: null, splits: [] }
    const shareAmount = Math.floor(amount / cards.length)
    const remainder   = amount - shareAmount * cards.length
    const splits = cards.map((card, i) => ({
      card,
      amount: i === 0 ? shareAmount + remainder : shareAmount,
    }))
    return { primary: splits[0].card, splits }
  }

  if (rule.mode === 'auto-split') {
    // TODO: implement balance-aware auto-split
    return { primary: rule.primaryCardId, splits: [] }
  }

  return { primary: null, splits: [] }
}

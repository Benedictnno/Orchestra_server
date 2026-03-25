import Transaction from '../db/models/Transaction.js'

export async function getSpendingSummary(userId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const txns  = await Transaction.find({ userId, transactionDate: { $gte: since } })

  const byCategory = txns.reduce((acc, t) => {
    const cat = t.category || 'other'
    acc[cat] = (acc[cat] || 0) + t.amount
    return acc
  }, {})

  const topMerchants = Object.entries(
    txns.reduce((acc, t) => {
      if (t.merchant) acc[t.merchant] = (acc[t.merchant] || 0) + t.amount
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const totalSpent        = txns.reduce((s, t) => s + t.amount, 0)
  const subscriptionSpend = byCategory['subscriptions'] || 0
  const anomalyCount      = txns.filter(t => t.isAnomaly).length

  return {
    byCategory, totalSpent, topMerchants,
    transactionCount: txns.length, subscriptionSpend, anomalyCount, days
  }
}

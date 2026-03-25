import Transaction from '../db/models/Transaction.js'
import { getSpendingSummary } from '../services/insights.js'

export async function getReport(req, res) {
  const days  = parseInt(req.query.days ?? '30')
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [txns, summary] = await Promise.all([
    Transaction.find({ userId: req.user._id, transactionDate: { $gte: since } })
      .sort({ transactionDate: -1 }),
    getSpendingSummary(req.user._id, days)
  ])

  res.json({
    report: {
      generatedAt:  new Date().toISOString(),
      period:       `Last ${days} days`,
      user:         req.user.name,
      totalSpent:   summary.totalSpent / 100,
      currency:     'NGN',
      byCategory:   Object.fromEntries(
        Object.entries(summary.byCategory).map(([k,v]) => [k, v / 100])
      ),
      topMerchants: summary.topMerchants.map(([m,v]) => ({ merchant: m, amount: v / 100 })),
      transactions: txns.map(t => ({
        date:      t.transactionDate,
        merchant:  t.merchant,
        category:  t.category,
        amount:    t.amount / 100,
        reference: t.reference,
        flagged:   t.isAnomaly,
      }))
    }
  })
}

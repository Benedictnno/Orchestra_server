import Transaction from '../db/models/Transaction.js'

// POST /api/report  — generate a spending report for a date range
export async function generateReport(req, res) {
  const { from, to, format = 'json' } = req.body

  const filter = {
    userId: req.user._id,
    transactionDate: {
      $gte: new Date(from),
      $lte: new Date(to),
    },
  }

  const transactions = await Transaction.find(filter).sort({ transactionDate: -1 })

  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0)
  const byCategory = transactions.reduce((acc, t) => {
    const cat = t.category || 'other'
    acc[cat] = (acc[cat] || 0) + t.amount
    return acc
  }, {})

  // TODO: support PDF/CSV format via a report service
  res.json({
    report: {
      from,
      to,
      totalSpent,
      totalSpentNGN: (totalSpent / 100).toFixed(2),
      byCategory,
      transactionCount: transactions.length,
      format,
    },
  })
}

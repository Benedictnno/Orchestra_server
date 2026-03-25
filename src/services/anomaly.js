import Transaction from '../db/models/Transaction.js'

export async function detectAnomalies(userId, amountKobo, merchant, category) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const txns = await Transaction.find({ userId, transactionDate: { $gte: thirtyDaysAgo } })

  const reasons = []

  // Rule 1: Amount is 3x the average for this category
  const catTxns = txns.filter(t => t.category === category)
  if (catTxns.length >= 3) {
    const avg = catTxns.reduce((s, t) => s + t.amount, 0) / catTxns.length
    if (amountKobo > avg * 3) {
      reasons.push(`This ${category} transaction is ${(amountKobo / avg).toFixed(1)}x your average`)
    }
  }

  // Rule 2: First transaction with merchant above NGN 20,000 (2M kobo)
  const seenMerchant = txns.some(t =>
    t.merchant?.toLowerCase() === merchant?.toLowerCase()
  )
  if (!seenMerchant && amountKobo > 2000000) {
    reasons.push(`First transaction with ${merchant}`)
  }

  // Rule 3: Unusual hour — 11pm to 5am WAT (22:00-04:00 UTC)
  const hour = new Date().getUTCHours()
  if (hour >= 22 || hour <= 4) {
    reasons.push('Transaction initiated at an unusual time')
  }

  // Rule 4: Same merchant within 10 minutes
  const tenMinAgo  = new Date(Date.now() - 10 * 60 * 1000)
  const recentSame = txns.filter(t =>
    t.merchant?.toLowerCase() === merchant?.toLowerCase() &&
    t.transactionDate >= tenMinAgo
  )
  if (recentSame.length > 0) {
    reasons.push('Duplicate — same merchant within 10 minutes')
  }

  if (reasons.length === 0) return null
  return { flagged: true, reasons, severity: reasons.length > 1 ? 'high' : 'medium' }
}

// Bulk scan for retroactivity
export async function scanUserAnomalies(userId) {
  const txns = await Transaction.find({ userId }).sort({ transactionDate: -1 }).limit(50)
  let flagged = 0
  for (let t of txns) {
    if (!t.isAnomaly) {
      const anomaly = await detectAnomalies(userId, t.amount, t.merchant, t.category)
      if (anomaly) {
        t.isAnomaly = true
        t.anomalyReason = anomaly.reasons.join(', ')
        await t.save()
        flagged++
      }
    }
  }
  return flagged
}

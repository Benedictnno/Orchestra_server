/**
 * Anomaly Detection Service
 * Flags transactions that deviate significantly from a user's spending patterns.
 */
import Transaction from '../db/models/Transaction.js'

const ANOMALY_MULTIPLIER = 3   // flag if > 3× average spend for category
const MIN_SAMPLES        = 5   // need at least 5 past transactions to baseline

/**
 * Check a single transaction amount against historical average for that category.
 * Returns { isAnomaly, reason } — callers should apply these fields to the document.
 *
 * @param {string} userId
 * @param {string} category
 * @param {number} amount   kobo
 */
export async function checkAnomaly(userId, category, amount) {
  const history = await Transaction.find({
    userId,
    category,
    isAnomaly: false,
  }).select('amount').limit(100)

  if (history.length < MIN_SAMPLES) {
    return { isAnomaly: false, reason: null }
  }

  const avg = history.reduce((s, t) => s + t.amount, 0) / history.length
  const threshold = avg * ANOMALY_MULTIPLIER

  if (amount > threshold) {
    return {
      isAnomaly: true,
      reason: `Amount ₦${(amount / 100).toFixed(2)} is ${(amount / avg).toFixed(1)}× the average for ${category}`,
    }
  }

  return { isAnomaly: false, reason: null }
}

/**
 * Scan the 50 most recent transactions for a user and flag anomalies.
 * Updates documents in-place.
 *
 * @param {string} userId
 * @returns {number} count of newly flagged transactions
 */
export async function scanUserAnomalies(userId) {
  const recent = await Transaction.find({ userId, isAnomaly: false })
    .sort({ transactionDate: -1 })
    .limit(50)

  let flagged = 0
  for (const tx of recent) {
    const { isAnomaly, reason } = await checkAnomaly(userId, tx.category, tx.amount)
    if (isAnomaly) {
      tx.isAnomaly    = true
      tx.anomalyReason = reason
      await tx.save()
      flagged++
    }
  }
  return flagged
}

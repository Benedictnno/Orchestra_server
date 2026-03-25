import Transaction from '../db/models/Transaction.js'
import { scanUserAnomalies } from '../services/anomaly.js'

// GET /api/anomalies
export async function getAnomalies(req, res) {
  const anomalies = await Transaction.find({ userId: req.user._id, isAnomaly: true })
    .sort({ transactionDate: -1 })
    .limit(50)
  res.json({ anomalies })
}

// POST /api/anomalies/scan  — manual trigger to scan recent transactions
export async function scanAnomalies(req, res) {
  const flaggedCount = await scanUserAnomalies(req.user._id)
  res.json({ message: 'Anomaly scan complete', flaggedCount })
}

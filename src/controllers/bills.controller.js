import BillPayment from '../db/models/BillPayment.js'
import Card from '../db/models/Card.js'
import Transaction from '../db/models/Transaction.js'
import { card360 } from '../services/card360.js'
import { randomUUID } from 'crypto'

/**
 * Perform a bill payment using a specific card as the source of funds.
 * Verifies with Card360.
 */
export async function createBillPayment(req, res) {
  const { amount, sourceCardId, billerCode, billerName, customerId, narration } = req.body
  const amountKobo = Math.round(amount * 100)

  const sourceCard = await Card.findOne({ _id: sourceCardId, userId: req.user._id })
  if (!sourceCard) return res.status(404).json({ error: 'Source card not found' })

  // 1. Check card balance
  const bal = await card360.getBalance(sourceCard.pan, sourceCard.cardType)
  if (bal.availableBalance < amountKobo) {
    return res.status(400).json({ error: 'Insufficient funds on source card' })
  }

  const reference = randomUUID()

  // 2. Create the unified Transaction record (type: bill_payment)
  const tx = await Transaction.create({
    userId:          req.user._id,
    cardId:          sourceCard._id,
    pan:             sourceCard.pan,
    amount:          amountKobo,
    type:            'bill_payment',
    category:        'bills',
    merchant:        billerCode, // Biller code as merchant
    narration:       narration || `Bill Payment: ${billerName || billerCode}`,
    reference,
  })

  // 3. Create the detailed BillPayment record
  const payment = await BillPayment.create({
    userId:          req.user._id,
    sourceCardId:    sourceCard._id,
    sourcePan:       sourceCard.pan,
    amount:          amountKobo,
    billerCode,
    billerName,
    customerId,
    narration,
    reference,
    transactionId:   tx._id,
    status:          'success',
  })

  res.status(201).json({ success: true, payment })
}

export async function getBillPayments(req, res) {
  const payments = await BillPayment.find({ userId: req.user._id }).sort({ createdAt: -1 })
  res.json({ payments })
}

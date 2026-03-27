import Transfer from '../db/models/Transfer.js'
import Card from '../db/models/Card.js'
import Transaction from '../db/models/Transaction.js'
import { card360 } from '../services/card360.js'
import { randomUUID } from 'crypto'

/**
 * Perform a bank transfer using a specific card as the source of funds.
 * Verifies balance with Card360 before committing.
 */
export async function createTransfer(req, res) {
  const { amount, sourceCardId, recipientBank, recipientAccount, recipientName, narration } = req.body
  const amountKobo = Math.round(amount * 100)

  const sourceCard = await Card.findOne({ _id: sourceCardId, userId: req.user._id })
  if (!sourceCard) return res.status(404).json({ error: 'Source card not found' })

  // 1. Check card balance
  const bal = await card360.getBalance(sourceCard.pan, sourceCard.cardType)
  if (bal.availableBalance < amountKobo) {
    return res.status(400).json({ error: 'Insufficient funds on source card' })
  }

  const reference = randomUUID()

  // 2. Create the unified Transaction record (type: transfer)
  const tx = await Transaction.create({
    userId:          req.user._id,
    cardId:          sourceCard._id,
    pan:             sourceCard.pan,
    amount:          amountKobo,
    type:            'transfer',
    category:        'transfer',
    merchant:        recipientBank, // Bank code as merchant
    narration:       narration || `Transfer to ${recipientName}`,
    reference,
  })

  // 3. Create the detailed Transfer record
  const transfer = await Transfer.create({
    userId:          req.user._id,
    sourceCardId:    sourceCard._id,
    sourcePan:       sourceCard.pan,
    amount:          amountKobo,
    recipientBank,
    recipientAccount,
    recipientName,
    narration,
    reference,
    transactionId:   tx._id,
    status:          'success',
  })

  res.status(201).json({ success: true, transfer })
}

export async function getTransfers(req, res) {
  const transfers = await Transfer.find({ userId: req.user._id }).sort({ createdAt: -1 })
  res.json({ transfers })
}

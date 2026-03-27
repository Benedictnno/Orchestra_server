/**
 * Transfer record — stores bank-transfer-specific fields.
 * Always paired with a Transaction document (type: 'transfer').
 */
import mongoose from 'mongoose'

const transferSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sourceCardId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true },
  sourcePan:        String,                 // stored at time of transfer (not masked)
  amount:           { type: Number, required: true },  // kobo
  currency:         { type: String, default: 'NGN' },
  narration:        String,
  reference:        { type: String, unique: true },
  // Recipient details
  recipientName:    { type: String, required: true },
  recipientAccount: { type: String, required: true },  // 10-digit NUBAN
  recipientBank:    { type: String, required: true },  // bank code e.g. '058' (GTBank)
  recipientBankName: String,                // human-readable bank name
  // Linked transaction
  transactionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  status:           { type: String, enum: ['pending', 'success', 'failed'], default: 'success' },
}, { timestamps: true })

transferSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.model('Transfer', transferSchema)

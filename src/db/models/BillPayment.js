/**
 * BillPayment record — stores bill-payment-specific fields.
 * Always paired with a Transaction document (type: 'bill_payment').
 */
import mongoose from 'mongoose'

const billPaymentSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sourceCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true },
  sourcePan:    String,
  amount:       { type: Number, required: true },  // kobo
  currency:     { type: String, default: 'NGN' },
  reference:    { type: String, unique: true },
  // Biller details
  billerCode:   { type: String, required: true },  // e.g. 'DSTV', 'EKEDC', 'IKEDC'
  billerName:   String,                            // human-readable e.g. 'DSTV Nigeria'
  customerId:   { type: String, required: true },  // meter no. / smartcard no. / phone no.
  narration:    String,
  // Linked transaction
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  status:       { type: String, enum: ['pending', 'success', 'failed'], default: 'success' },
}, { timestamps: true })

billPaymentSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.model('BillPayment', billPaymentSchema)

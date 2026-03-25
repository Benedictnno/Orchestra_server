import mongoose from 'mongoose'

const virtualCardSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parentCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true },
  label:        { type: String, required: true },
  merchant:     String,
  spendLimit:   { type: Number, required: true },   // monthly limit in kobo
  amountSpent:  { type: Number, default: 0 },
  autoRenew:    { type: Boolean, default: true },
  paused:       { type: Boolean, default: false },
  pan:          String,
  expiryDate:   String,
  cardStatus:   { type: String, default: '1' },
}, { timestamps: true })

export default mongoose.model('VirtualCard', virtualCardSchema)

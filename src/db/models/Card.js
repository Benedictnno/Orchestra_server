import mongoose from 'mongoose'

const cardSchema = new mongoose.Schema({
  // Card360 fields — exact names from fetchSingle response
  pan:          { type: String, required: true },
  expiryDate:   { type: String, required: true },   // YYMM e.g. '2612'
  issuerNr:     { type: String, required: true },
  firstName:    String,
  lastName:     String,
  nameOnCard:   String,
  cardProgram:  { type: String, enum: ['VERVE', 'VISA', 'MASTERCARD'] },
  customerId:   String,
  cardStatus:   { type: String, enum: ['0', '1', '2'], default: '1' },
                // 0=inactive, 1=active, 2=blocked
  seqNr:        String,

  // Orchestra fields
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cardType:     { type: String, enum: ['debit', 'prepaid', 'virtual'], required: true },
  label:        String,
  bank:         String,
  color:        String,       // hex color for card UI rendering
  isDefault:    { type: Boolean, default: false },
  spendLimit:   Number,       // in kobo
  linkedCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
}, { timestamps: true })

export default mongoose.model('Card', cardSchema)

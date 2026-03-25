import mongoose from 'mongoose'

const balanceSchema = new mongoose.Schema({
  pan:                 { type: String, required: true },
  availableBalance:    { type: Number, required: true },  // kobo
  ledgerBalance:       { type: Number, required: true },  // kobo
  currency:            { type: String, default: 'NGN' },
  responseCode:        { type: String, default: '00' },
  responseDescription: { type: String, default: 'Successful' },
  cardId:              { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
  fetchedAt:           { type: Date, default: Date.now },
}, { timestamps: true })

export default mongoose.model('CardBalance', balanceSchema)

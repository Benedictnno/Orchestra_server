import mongoose from 'mongoose'

const businessCardSchema = new mongoose.Schema({
  businessUserId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo:         String,
  purpose:            String,
  budget:             { type: Number, required: true },   // kobo
  amountSpent:        { type: Number, default: 0 },
  merchantCategories: [String],
  expiresAt:          Date,
  status:             { type: String, enum: ['active', 'suspended', 'exhausted'], default: 'active' },
  approvalThreshold:  Number,    // kobo — transactions above this need approval
  pan:                String,
  cardStatus:         { type: String, default: '1' },
}, { timestamps: true })

export default mongoose.model('BusinessCard', businessCardSchema)

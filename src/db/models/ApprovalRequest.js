import mongoose from 'mongoose'

const approvalSchema = new mongoose.Schema({
  businessCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessCard', required: true },
  requestedBy:    String,          // employee name
  amount:         { type: Number, required: true },   // kobo
  merchant:       String,
  reason:         String,
  status:         { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:     Date,
  reviewNote:     String,
}, { timestamps: true })

export default mongoose.model('ApprovalRequest', approvalSchema)

import mongoose from 'mongoose'

const insightSchema = new mongoose.Schema({
  userId:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  summary:            String,
  insights:           [String],
  recommendations:    [String],
  anomalies:          [String],
  savingsOpportunity: Number,    // in NGN
  byCategory:         mongoose.Schema.Types.Mixed,
  totalSpent:         Number,
  financialScore:     Number,  // 0-100 overall financial health
  generatedAt:        { type: Date, default: Date.now },
}, { timestamps: true })

export default mongoose.model('Insight', insightSchema)

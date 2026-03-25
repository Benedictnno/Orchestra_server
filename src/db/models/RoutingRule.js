import mongoose from 'mongoose'

const ruleSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  mode:          { type: String, enum: ['primary', 'balanced', 'auto-split'], default: 'primary' },
  primaryCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
  cardOrder:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
}, { timestamps: true })

export default mongoose.model('RoutingRule', ruleSchema)

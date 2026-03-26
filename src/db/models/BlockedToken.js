/**
 * Stores invalidated JWT tokens until their natural expiry.
 * The TTL index automatically removes entries once the token
 * would have expired anyway, so the blocklist never grows unbounded.
 */
import mongoose from 'mongoose'

const blockedTokenSchema = new mongoose.Schema({
  token:     { type: String, required: true, unique: true },
  expiresAt: { type: Date,   required: true },          // mirrors JWT exp claim
})

// MongoDB auto-deletes the document when expiresAt is reached
blockedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model('BlockedToken', blockedTokenSchema)

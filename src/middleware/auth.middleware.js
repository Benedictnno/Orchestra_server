import jwt from 'jsonwebtoken'
import User from '../db/models/User.js'
import BlockedToken from '../db/models/BlockedToken.js'

export async function protect(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Reject if the token has been explicitly logged out
    const blocked = await BlockedToken.exists({ token })
    if (blocked) return res.status(401).json({ error: 'Token has been revoked — please log in again' })

    req.user  = await User.findById(decoded.id).select('-password')
    req.token = token       // forward raw token so logout can read it
    if (!req.user) return res.status(401).json({ error: 'User not found' })
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

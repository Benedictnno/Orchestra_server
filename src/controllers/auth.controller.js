import jwt from 'jsonwebtoken'
import User from '../db/models/User.js'
import BlockedToken from '../db/models/BlockedToken.js'

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

// POST /api/auth/register
export async function register(req, res) {
  const { name, email, password, role, businessName } = req.body

  const exists = await User.findOne({ email })
  if (exists) return res.status(409).json({ error: 'Email already registered' })

  const user = await User.create({ name, email, password, role, businessName })
  const token = signToken(user._id)

  res.status(201).json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  })
}

// POST /api/auth/login
export async function login(req, res) {
  const { email, password } = req.body

  const user = await User.findOne({ email })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })

  const match = await user.comparePassword(password)
  if (!match) return res.status(401).json({ error: 'Invalid credentials' })

  const token = signToken(user._id)

  res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  })
}

// GET /api/auth/me
export async function getMe(req, res) {
  res.json({ user: req.user })
}

// POST /api/auth/logout
export async function logout(req, res) {
  // req.token is set by the protect middleware
  const token   = req.token
  const decoded = jwt.decode(token)                   // already verified — just decode exp
  const expiresAt = new Date(decoded.exp * 1000)      // exp is in seconds, Date wants ms

  await BlockedToken.updateOne(
    { token },
    { token, expiresAt },
    { upsert: true }                                  // idempotent — safe to call twice
  )

  res.json({ message: 'Logged out successfully' })
}

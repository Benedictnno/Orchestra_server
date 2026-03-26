import { Router } from 'express'
import { register, login, getMe, logout } from '../controllers/auth.controller.js'
import { protect } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { registerSchema, loginSchema } from '../middleware/schemas.js'

const router = Router()

router.post('/register', validate(registerSchema), register)
router.post('/login',    validate(loginSchema), login)
router.get('/me',        protect, getMe)
router.post('/logout',   protect, logout)

export default router

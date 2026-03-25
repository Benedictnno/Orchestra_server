import { Router } from 'express'
import { getInsights, generateInsights } from '../controllers/insights.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

router.use(protect)

router.get('/', getInsights)
router.post('/generate', generateInsights)

export default router

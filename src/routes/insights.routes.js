import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { getInsights, getSavings } from '../controllers/insights.controller.js'

const router = Router()
router.use(protect)

router.get('/',         getInsights)
router.post('/savings', getSavings)
// Fallback path just in case
router.post('/generate', getInsights) 

export default router

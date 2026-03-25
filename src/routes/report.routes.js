import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { getReport } from '../controllers/report.controller.js'

const router = Router()
router.use(protect)

router.get('/', getReport)

export default router

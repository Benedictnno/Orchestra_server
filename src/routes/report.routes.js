import { Router } from 'express'
import { generateReport } from '../controllers/report.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

router.use(protect)

router.post('/', generateReport)

export default router

import { Router } from 'express'
import { getAnomalies, scanAnomalies } from '../controllers/anomalies.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

router.use(protect)

router.get('/',      getAnomalies)
router.post('/scan', scanAnomalies)

export default router

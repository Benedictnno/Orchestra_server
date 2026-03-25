import { Router } from 'express'
import { getRule, upsertRule, simulate } from '../controllers/routing.controller.js'
import { protect } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { upsertRoutingSchema, simulateRoutingSchema } from '../middleware/schemas.js'

const router = Router()

router.use(protect)

router.route('/').get(getRule).put(validate(upsertRoutingSchema), upsertRule)
router.post('/simulate', validate(simulateRoutingSchema), simulate)

export default router

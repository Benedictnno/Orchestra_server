import { Router } from 'express'
import { protect }      from '../middleware/auth.middleware.js'
import { requireRole }  from '../middleware/role.middleware.js'
import { validate }     from '../middleware/validate.middleware.js'
import { createBusinessCardSchema, approvalSchema }
  from '../middleware/schemas.js'
import { getBusinessCards, createBusinessCard,
         updateBusinessCard, handleApproval }
  from '../controllers/business.controller.js'

const router = Router()
router.use(protect)

router.get('/',         requireRole('business'), getBusinessCards)
router.post('/',        requireRole('business'), validate(createBusinessCardSchema), createBusinessCard)
router.patch('/:id',    requireRole('business'), updateBusinessCard)
router.post('/approve', requireRole('business'), validate(approvalSchema), handleApproval)

export default router

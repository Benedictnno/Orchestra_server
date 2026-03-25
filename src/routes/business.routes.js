import { Router } from 'express'
import { protect }      from '../middleware/auth.middleware.js'
import { requireRole }  from '../middleware/role.middleware.js'
import { getBusinessCards, createBusinessCard,
         updateBusinessCard, handleApproval }
  from '../controllers/business.controller.js'

const router = Router()
router.use(protect)

router.get('/',         requireRole('business'), getBusinessCards)
router.post('/',        requireRole('business'), createBusinessCard)
router.patch('/:id',    requireRole('business'), updateBusinessCard)
router.post('/approve', requireRole('business'), handleApproval)

export default router

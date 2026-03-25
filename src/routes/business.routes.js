import { Router } from 'express'
import {
  getBusinessCards, createBusinessCard, getBusinessCard, updateBusinessCard,
  getApprovals, reviewApproval,
} from '../controllers/business.controller.js'
import { protect } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'

const router = Router()

router.use(protect, requireRole('business'))

router.route('/cards').get(getBusinessCards).post(createBusinessCard)
router.route('/cards/:id').get(getBusinessCard).patch(updateBusinessCard)
router.route('/approvals').get(getApprovals)
router.route('/approvals/:id').patch(reviewApproval)

export default router

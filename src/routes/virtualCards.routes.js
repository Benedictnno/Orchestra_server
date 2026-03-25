import { Router } from 'express'
import {
  getVirtualCards, createVirtualCard, getVirtualCard, updateVirtualCard, deleteVirtualCard,
} from '../controllers/virtualCards.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

router.use(protect)

router.route('/').get(getVirtualCards).post(createVirtualCard)
router.route('/:id').get(getVirtualCard).patch(updateVirtualCard).delete(deleteVirtualCard)

export default router

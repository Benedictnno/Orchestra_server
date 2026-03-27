import { Router } from 'express'
import { protect }  from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { createVirtualCardSchema, topUpSchema } from '../middleware/schemas.js'
import { getVirtualCards, createVirtualCard, updateVirtualCard, topUpVirtualCard }
  from '../controllers/virtualCards.controller.js'

const router = Router()
router.use(protect)

router.get('/',           getVirtualCards)
router.post('/',          validate(createVirtualCardSchema), createVirtualCard)
router.patch('/:id',      updateVirtualCard)
router.post('/:id/top-up', validate(topUpSchema), topUpVirtualCard)

export default router

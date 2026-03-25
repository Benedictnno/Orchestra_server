import { Router } from 'express'
import { protect }  from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { getVirtualCards, createVirtualCard, updateVirtualCard }
  from '../controllers/virtualCards.controller.js'
import { z } from 'zod'

const createSchema = z.object({
  label:        z.string().min(1),
  parentCardId: z.string(),
  spendLimit:   z.number().positive(),   // Naira — converted to kobo
  merchant:     z.string().optional(),
  autoRenew:    z.boolean().default(true),
})

const router = Router()
router.use(protect)

router.get('/',      getVirtualCards)
router.post('/',     validate(createSchema), createVirtualCard)
router.patch('/:id', updateVirtualCard)

export default router

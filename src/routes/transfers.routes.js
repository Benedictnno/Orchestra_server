import { Router } from 'express'
import { protect }  from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { transferSchema } from '../middleware/schemas.js'
import { createTransfer, getTransfers } from '../controllers/transfers.controller.js'

const router = Router()
router.use(protect)

router.get('/',      getTransfers)
router.post('/',     validate(transferSchema), createTransfer)

export default router

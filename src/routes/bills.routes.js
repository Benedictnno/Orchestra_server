import { Router } from 'express'
import { protect }  from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { billPaymentSchema } from '../middleware/schemas.js'
import { createBillPayment, getBillPayments } from '../controllers/bills.controller.js'

const router = Router()
router.use(protect)

router.get('/',      getBillPayments)
router.post('/',     validate(billPaymentSchema), createBillPayment)

export default router

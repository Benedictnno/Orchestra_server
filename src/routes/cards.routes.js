import { Router } from 'express'
import {
  getCards, addCard, getCard, updateCard, deleteCard, getCardBalance,
} from '../controllers/cards.controller.js'
import { protect } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { addCardSchema, updateCardSchema } from '../middleware/schemas.js'

const router = Router()

router.use(protect)

router.route('/')
  .get(getCards)
  .post(validate(addCardSchema), addCard)

router.route('/:id')
  .get(getCard)
  .patch(validate(updateCardSchema), updateCard)
  .delete(deleteCard)

router.get('/:id/balance', getCardBalance)

export default router

/**
 * Zod request validation middleware factory.
 * Usage: router.post('/path', validate(myZodSchema), handler)
 *
 * Validates req.body against the provided Zod schema.
 * On failure, responds 400 with structured field errors.
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      return res.status(400).json({ error: 'Validation failed', errors })
    }
    req.body = result.data
    next()
  }
}

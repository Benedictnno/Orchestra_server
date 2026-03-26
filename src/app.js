import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import { randomUUID } from 'crypto'
import 'express-async-errors'
import swaggerUi from 'swagger-ui-express'
import YAML from 'yamljs'
import path from 'path'
import { fileURLToPath } from 'url'

import authRoutes         from './routes/auth.routes.js'
import cardsRoutes        from './routes/cards.routes.js'
import routingRoutes      from './routes/routing.routes.js'
import virtualCardsRoutes from './routes/virtualCards.routes.js'
import businessRoutes     from './routes/business.routes.js'
import insightsRoutes     from './routes/insights.routes.js'
import transactionsRoutes from './routes/transactions.routes.js'
import anomaliesRoutes    from './routes/anomalies.routes.js'
import reportRoutes       from './routes/report.routes.js'
import rateLimit from 'express-rate-limit'
import { errorHandler }   from './middleware/error.middleware.js'

const app = express()

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please slow down' }
})
app.use('/api/', limiter)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'))

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

// Security headers
app.use(helmet())

// Structured request logging with correlation ID
app.use(pinoHttp({
  genReqId: () => randomUUID(),
  redact:   ['req.headers.authorization'],   // don't log JWTs
  serializers: {
    req(req) { return { id: req.id, method: req.method, url: req.url } },
    res(res) { return { statusCode: res.statusCode } },
  },
}))

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json())

// Health check (public)
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.use('/api/auth',          authRoutes)
app.use('/api/cards',         cardsRoutes)
app.use('/api/routing',       routingRoutes)
app.use('/api/virtual-cards', virtualCardsRoutes)
app.use('/api/business',      businessRoutes)
app.use('/api/insights',      insightsRoutes)
app.use('/api/transactions',  transactionsRoutes)
app.use('/api/anomalies',     anomaliesRoutes)
app.use('/api/report',        reportRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` })
})

// Global error handler — must be registered last
app.use(errorHandler)

export default app
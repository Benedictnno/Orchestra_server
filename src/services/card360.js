/**
 * Card360 Service
 * Wraps all HTTP calls to the Interswitch Card360 API.
 * When CARD360_ENABLED=false, every method returns mock data.
 */
import axios from 'axios'

const enabled = process.env.CARD360_ENABLED === 'true'
const baseURL = process.env.CARD360_BASE_URL
const token   = process.env.CARD360_TOKEN

const client = axios.create({
  baseURL,
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  timeout: 10_000,
})

// ─── Mock helpers ────────────────────────────────────────────────────────────

function mockBalance(pan) {
  return {
    pan,
    availableBalance: 250_000_00,  // ₦250,000 in kobo
    ledgerBalance:    260_000_00,
    currency: 'NGN',
    responseCode: '00',
    responseDescription: 'Successful (mock)',
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch balance for a single card PAN.
 * @param {string} pan
 */
export async function fetchBalance(pan) {
  if (!enabled) return mockBalance(pan)
  const { data } = await client.post('/api/v1/cards/balance', { pan })
  return data
}

/**
 * Fetch card detail from Card360.
 * @param {string} pan
 */
export async function fetchCardDetail(pan) {
  if (!enabled) {
    return {
      pan,
      expiryDate:  '2612',
      issuerNr:    '000001',
      cardStatus:  '1',
      cardProgram: 'VERVE',
      responseCode: '00',
    }
  }
  const { data } = await client.post('/api/v1/cards/detail', { pan })
  return data
}

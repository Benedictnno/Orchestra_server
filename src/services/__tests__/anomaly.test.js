/**
 * Unit tests for detectAnomalies — no DB needed, mocks Transaction.find.
 */
import { jest } from '@jest/globals'

jest.mock('../../db/models/Transaction.js', () => ({
  default: { find: jest.fn() }
}))

import Transaction from '../../db/models/Transaction.js'
import { detectAnomalies } from '../anomaly.js'

// Build a fake transaction
const tx = (overrides = {}) => ({
  category: 'food',
  merchant: 'Shoprite',
  amount: 10_000_00,
  transactionDate: new Date(Date.now() - 60 * 60 * 1000), // 1hr ago
  isAnomaly: false,
  ...overrides,
})

describe('detectAnomalies', () => {
  test('returns null when no anomaly rules are triggered', async () => {
    Transaction.find.mockResolvedValue([
      tx({ amount: 10_000_00 }),
      tx({ amount: 12_000_00 }),
      tx({ amount: 9_000_00 }),
    ])

    const result = await detectAnomalies('user1', 11_000_00, 'Shoprite', 'food')
    expect(result).toBeNull()
  })

  test('flags when amount is 3x category average', async () => {
    // avg food = 10000 kobo
    Transaction.find.mockResolvedValue([
      tx({ amount: 10_000, category: 'food' }),
      tx({ amount: 10_000, category: 'food' }),
      tx({ amount: 10_000, category: 'food' }),
    ])

    const result = await detectAnomalies('user1', 50_000, 'Shoprite', 'food')
    expect(result).not.toBeNull()
    expect(result.flagged).toBe(true)
    expect(result.reasons.some(r => r.includes('food'))).toBe(true)
  })

  test('flags a first-time merchant above NGN 20k threshold', async () => {
    // No previous transactions with this merchant
    Transaction.find.mockResolvedValue([
      tx({ merchant: 'Shoprite' }),
    ])

    const result = await detectAnomalies('user1', 2_500_000, 'Jumia', 'shopping')
    expect(result).not.toBeNull()
    expect(result.reasons.some(r => r.includes('Jumia'))).toBe(true)
  })

  test('flags duplicate merchant within 10 minutes', async () => {
    Transaction.find.mockResolvedValue([
      tx({ merchant: 'Netflix', transactionDate: new Date(Date.now() - 5 * 60 * 1000) }),
    ])

    const result = await detectAnomalies('user1', 150_000, 'Netflix', 'subscriptions')
    expect(result).not.toBeNull()
    expect(result.reasons.some(r => r.includes('Duplicate'))).toBe(true)
  })

  test('reports high severity when multiple rules fire', async () => {
    // Sets up both the 3x avg AND duplicate merchant rules
    Transaction.find.mockResolvedValue([
      tx({ amount: 10_000, category: 'food', merchant: 'KFC', transactionDate: new Date(Date.now() - 2 * 60 * 1000) }),
      tx({ amount: 10_000, category: 'food', merchant: 'KFC' }),
      tx({ amount: 10_000, category: 'food', merchant: 'KFC' }),
    ])

    const result = await detectAnomalies('user1', 80_000, 'KFC', 'food')
    expect(result.severity).toBe('high')
    expect(result.reasons.length).toBeGreaterThan(1)
  })
})

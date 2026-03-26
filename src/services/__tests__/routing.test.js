/**
 * Unit tests for resolvePayment — the routing engine.
 * Mocks Card, RoutingRule and card360 so no DB connection is needed.
 */
import { jest } from '@jest/globals'

// ── Mocks ──────────────────────────────────────────────────────────────────────
jest.mock('../../db/models/Card.js',        () => ({ default: { find: jest.fn() } }))
jest.mock('../../db/models/RoutingRule.js', () => ({ default: { findOne: jest.fn() } }))
jest.mock('../card360.js',                  () => ({ card360: { getBalance: jest.fn() } }))

import Card        from '../../db/models/Card.js'
import RoutingRule from '../../db/models/RoutingRule.js'
import { card360 } from '../card360.js'
import { resolvePayment } from '../routing.js'

// Helper to build a fake populated card document
const fakeCard = (id, available) => ({
  _id:      { toString: () => id },
  pan:      `PAN_${id}`,
  cardType: 'debit',
  label:    `Card ${id}`,
  bank:     'TestBank',
  cardProgram: 'VERVE',
  toObject: function() { return { ...this, available } },
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('resolvePayment — auto-split mode', () => {
  beforeEach(() => {
    const c1 = fakeCard('card1', 5000_00)
    const c2 = fakeCard('card2', 3000_00)
    RoutingRule.findOne.mockResolvedValue({
      mode: 'auto-split',
      cardOrder: [c1, c2],
      populate: jest.fn().mockReturnThis(),
    })
    card360.getBalance.mockImplementation((pan) =>
      Promise.resolve({
        availableBalance: pan === 'PAN_card1' ? 5000_00 : 3000_00,
        ledgerBalance: 0, currency: 'NGN', code: '00'
      })
    )
  })

  test('charges first card when it fully covers the amount', async () => {
    const result = await resolvePayment('user1', 2000_00)
    expect(result.success).toBe(true)
    expect(result.allocations).toHaveLength(1)
    expect(result.allocations[0].charge).toBe(2000_00)
  })

  test('splits across two cards when first card is insufficient', async () => {
    const result = await resolvePayment('user1', 7000_00)
    expect(result.success).toBe(true)
    expect(result.allocations).toHaveLength(2)
    expect(result.allocations[0].charge).toBe(5000_00)
    expect(result.allocations[1].charge).toBe(2000_00)
  })

  test('returns failure when total balance is insufficient', async () => {
    const result = await resolvePayment('user1', 99_000_00)
    expect(result.success).toBe(false)
    expect(result.reason).toMatch(/insufficient/i)
  })
})

describe('resolvePayment — primary mode', () => {
  test('places primary card first in allocation order', async () => {
    const c1 = fakeCard('card1', 500_00)  // primary, small balance
    const c2 = fakeCard('card2', 5000_00)

    RoutingRule.findOne.mockResolvedValue({
      mode: 'primary',
      primaryCardId: c1,
      cardOrder: [c1, c2],
      populate: jest.fn().mockReturnThis(),
    })
    card360.getBalance.mockImplementation((pan) =>
      Promise.resolve({
        availableBalance: pan === 'PAN_card1' ? 500_00 : 5000_00,
        ledgerBalance: 0, currency: 'NGN', code: '00'
      })
    )

    const result = await resolvePayment('user1', 1000_00)
    expect(result.success).toBe(true)
    expect(result.allocations[0].card._id.toString()).toBe('card1')
    expect(result.allocations[1].card._id.toString()).toBe('card2')
  })
})

describe('resolvePayment — balanced mode', () => {
  test('distributes evenly across cards', async () => {
    const c1 = fakeCard('card1', 5000_00)
    const c2 = fakeCard('card2', 5000_00)

    RoutingRule.findOne.mockResolvedValue({
      mode: 'balanced',
      cardOrder: [c1, c2],
      populate: jest.fn().mockReturnThis(),
    })
    card360.getBalance.mockResolvedValue({
      availableBalance: 5000_00, ledgerBalance: 0, currency: 'NGN', code: '00'
    })

    const result = await resolvePayment('user1', 1000_00)
    expect(result.success).toBe(true)
    // Each card should get ~500 (ceil(1000/2))
    expect(result.allocations.every(a => a.charge <= 500_00)).toBe(true)
  })
})

/**
 * Seed script — populates the DB with two demo users, cards, routing rules,
 * and sample transactions so the frontend has data to render immediately.
 *
 * Run once:  node src/db/seed.js
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { randomUUID } from 'crypto'

import connectDB from './connect.js'
import User         from './models/User.js'
import Card         from './models/Card.js'
import CardBalance  from './models/CardBalance.js'
import RoutingRule  from './models/RoutingRule.js'
import Transaction  from './models/Transaction.js'
import VirtualCard  from './models/VirtualCard.js'
import BusinessCard from './models/BusinessCard.js'
import ApprovalRequest from './models/ApprovalRequest.js'

await connectDB()

// ── Wipe existing seed data ──────────────────────────────────────────────────
await Promise.all([
  User.deleteMany({}),
  Card.deleteMany({}),
  CardBalance.deleteMany({}),
  RoutingRule.deleteMany({}),
  Transaction.deleteMany({}),
  VirtualCard.deleteMany({}),
  BusinessCard.deleteMany({}),
  ApprovalRequest.deleteMany({}),
])
console.log('🗑  Cleared existing data')

// ── Users ────────────────────────────────────────────────────────────────────
const [alice, bob] = await User.create([
  { name: 'Alice Okonkwo',  email: 'alice@example.com', password: 'Password123!', role: 'individual' },
  { name: 'Bob Adeyemi',    email: 'bob@example.com',   password: 'Password123!', role: 'business',
    businessName: 'Adeyemi Logistics Ltd' },
])
console.log('👤  Users created:', alice.email, bob.email)

// ── Cards ────────────────────────────────────────────────────────────────────
const [aliceDebit, alicePrepaid] = await Card.create([
  {
    pan: '5061460000000000040', expiryDate: '2612', issuerNr: '000001',
    firstName: 'Alice', lastName: 'Okonkwo', nameOnCard: 'ALICE OKONKWO',
    cardProgram: 'VERVE', customerId: 'CUST001', cardStatus: '1', seqNr: '01',
    userId: alice._id, cardType: 'debit', label: 'GTBank Debit',
    bank: 'GTBank', color: '#FF6B35', isDefault: true,
  },
  {
    pan: '4084840000000040', expiryDate: '2709', issuerNr: '000002',
    firstName: 'Alice', lastName: 'Okonkwo', nameOnCard: 'ALICE OKONKWO',
    cardProgram: 'VISA', customerId: 'CUST001', cardStatus: '1', seqNr: '02',
    userId: alice._id, cardType: 'prepaid', label: 'Access Prepaid',
    bank: 'Access Bank', color: '#4ECDC4', isDefault: false,
  },
])

// ── Card Balances ────────────────────────────────────────────────────────────
await CardBalance.create([
  { pan: aliceDebit.pan,   availableBalance: 150_000_00, ledgerBalance: 160_000_00, cardId: aliceDebit._id },
  { pan: alicePrepaid.pan, availableBalance:  45_000_00, ledgerBalance:  45_000_00, cardId: alicePrepaid._id },
])

// ── Routing Rule ─────────────────────────────────────────────────────────────
await RoutingRule.create({
  userId: alice._id,
  mode: 'primary',
  primaryCardId: aliceDebit._id,
  cardOrder: [aliceDebit._id, alicePrepaid._id],
})

// ── Transactions ─────────────────────────────────────────────────────────────
const categories = ['food', 'transport', 'subscriptions', 'utilities', 'entertainment', 'shopping', 'other']
const merchants  = ['Shoprite', 'Uber', 'Netflix', 'EKEDC', 'Filmhouse', 'Jumia', 'Cold Stone']

const txData = Array.from({ length: 30 }, (_, i) => ({
  pan: aliceDebit.pan,
  cardId: aliceDebit._id,
  userId: alice._id,
  amount: Math.floor(Math.random() * 50_000_00) + 500_00,  // ₦500 – ₦50,500
  currency: 'NGN',
  merchant: merchants[i % merchants.length],
  category: categories[i % categories.length],
  narration: `Payment to ${merchants[i % merchants.length]}`,
  transactionDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
  reference: randomUUID(),
  responseCode: '00',
}))

await Transaction.insertMany(txData)

// ── Virtual Card ─────────────────────────────────────────────────────────────
await VirtualCard.create({
  userId: alice._id,
  parentCardId: aliceDebit._id,
  label: 'Netflix Subscription',
  merchant: 'Netflix',
  spendLimit: 5_000_00,  // ₦5,000/month
  amountSpent: 1_500_00,
  pan: '4111111111111111',
  expiryDate: '2612',
})

  // --- DAY 3 DEMO DATA: Virtual Cards ---
  await VirtualCard.insertMany([
    {
      userId: alice._id,
      parentCardId: aliceDebit._id,  // GTBank Main
      label: 'Netflix Sub',
      merchant: 'Netflix',
      spendLimit: 500000,    // 5k
      amountSpent: 350000,   // 3.5k
      pan: 'VIRT923456781200',
      expiryDate: '2712'
    },
    {
      userId: alice._id,
      parentCardId: aliceDebit._id,  // GTBank Main
      label: 'Spotify Sub',
      merchant: 'Spotify',
      spendLimit: 300000,    // 3k
      amountSpent: 299900,   // 2.999k (early maxed)
      pan: 'VIRT923456789901',
      expiryDate: '2801'
    }
  ])

  // --- DAY 3 DEMO DATA: Business Cards ---
  const bCard = await BusinessCard.create({
    businessUserId: bob._id,
    assignedTo: 'Emeka Okafor',
    purpose: 'Q1 Field Sales Trip',
    budget: 15000000, // 150k NGN
    amountSpent: 4750000, // 47.5k NGN
    merchantCategories: ['airlines', 'hotels', 'restaurants'],
    approvalThreshold: 2000000, // 20k NGN
    pan: 'BIZ5000219904992',
    expiresAt: new Date(Date.now() + 60 * 86400000)
  })

  // --- DAY 3 DEMO DATA: Approval Request ---
  await ApprovalRequest.create({
    businessCardId: bCard._id,
    requestedBy: 'Emeka Okafor',
    amount: 4500000, // 45k NGN
    merchant: 'Air Peace',
    reason: 'Flight to Abuja for Q1 sales meeting',
    status: 'pending'
  })

console.log('✅  Seed complete!')
console.log('   alice@example.com / Password123!')
console.log('   bob@example.com   / Password123!')

await mongoose.disconnect()

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
import Transfer from './models/Transfer.js'
import BillPayment from './models/BillPayment.js'
import Insight from './models/Insight.js'

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
  Transfer.deleteMany({}),
  BillPayment.deleteMany({}),
  Insight.deleteMany({}),
])
console.log('🗑  Cleared existing data')

// ── Users ────────────────────────────────────────────────────────────────────
const [alice, bob] = await User.create([
  { name: 'Alice Okonkwo',  email: 'alice@example.com', password: 'Password123!', role: 'business', businessName: 'Okonkwo Tech LLC' },
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
  { pan: aliceDebit.pan,   availableBalance: 500_000_00, ledgerBalance: 500_000_00, cardId: aliceDebit._id },
  { pan: alicePrepaid.pan, availableBalance: 500_000_00, ledgerBalance: 500_000_00, cardId: alicePrepaid._id },
])

// ── Routing Rule ─────────────────────────────────────────────────────────────
await RoutingRule.create({
  userId: alice._id,
  mode: 'primary',
  primaryCardId: aliceDebit._id,
  cardOrder: [aliceDebit._id, alicePrepaid._id],
})

// ── Transactions ─────────────────────────────────────────────────────────────
const preciseTransactions = [
  // Food (45k total)
  { cat: 'food', m: 'Cold Stone', amt: 500000 },
  { cat: 'food', m: 'KFC', amt: 1000000 },
  { cat: 'food', m: 'Chicken Republic', amt: 800000 },
  { cat: 'food', m: 'Domino Pizza', amt: 1200000 },
  { cat: 'food', m: 'Cold Stone', amt: 1000000 },
  // Transport (20k total)
  { cat: 'transport', m: 'Uber', amt: 400000 },
  { cat: 'transport', m: 'Bolt', amt: 350000 },
  { cat: 'transport', m: 'Uber', amt: 500000 },
  { cat: 'transport', m: 'Bolt', amt: 450000 },
  { cat: 'transport', m: 'Uber', amt: 300000 },
  // Subscriptions (5k total)
  { cat: 'subscriptions', m: 'Netflix', amt: 500000 },
  // Utilities (15k total)
  { cat: 'utilities', m: 'EKEDC', amt: 1000000 },
  { cat: 'utilities', m: 'MTN', amt: 500000 },
  // Entertainment (35k total)
  { cat: 'entertainment', m: 'Filmhouse', amt: 1500000 },
  { cat: 'entertainment', m: 'Spotify', amt: 500000 },
  { cat: 'entertainment', m: 'Filmhouse', amt: 1500000 },
  // Shopping (60k total)
  { cat: 'shopping', m: 'Shoprite', amt: 4850000, anomaly: true },
  { cat: 'shopping', m: 'Jumia', amt: 650000 },
  { cat: 'shopping', m: 'Spar', amt: 500000 },
  // Other (10k total)
  { cat: 'other', m: 'Paystack', amt: 1000000 },
]

const txData = preciseTransactions.map((tx, i) => ({
  pan: aliceDebit.pan,
  cardId: aliceDebit._id,
  userId: alice._id,
  amount: tx.amt,
  currency: 'NGN',
  merchant: tx.m,
  category: tx.cat,
  narration: `Payment to ${tx.m}`,
  transactionDate: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000), // past 20 days
  reference: randomUUID(),
  responseCode: '00',
  isAnomaly: !!tx.anomaly,
  anomalyReason: tx.anomaly ? 'High value transaction outside normal spending patterns' : undefined,
}))

await Transaction.insertMany(txData)

// ── Virtual Cards ─────────────────────────────────────────────────────────────
// Two demo virtual cards: Netflix (active) and Spotify (nearly exhausted)
await VirtualCard.insertMany([
  {
    userId: alice._id,
    parentCardId: aliceDebit._id,
    label: 'Netflix Sub',
    merchant: 'Netflix',
    spendLimit: 500000,    // ₦5,000/month in kobo
    amountSpent: 350000,   // ₦3,500 spent
    pan: 'VIRT923456781200',
    expiryDate: '2712'
  },
  {
    userId: alice._id,
    parentCardId: aliceDebit._id,
    label: 'Spotify Sub',
    merchant: 'Spotify',
    spendLimit: 300000,    // ₦3,000/month in kobo
    amountSpent: 299900,   // nearly exhausted
    pan: 'VIRT923456789901',
    expiryDate: '2801'
  }
])

// ── Business Cards & Approvals ────────────────────────────────────────────────
const bCard = await BusinessCard.create({
  businessUserId: alice._id,
  assignedTo: 'Emeka Okafor',
  purpose: 'Q1 Field Sales Trip',
  budget: 15000000,          // ₦150,000 in kobo
  amountSpent: 4750000,      // ₦47,500 spent
  merchantCategories: ['airlines', 'hotels', 'restaurants'],
  approvalThreshold: 2000000, // ₦20,000 — above this needs approval
  pan: 'BIZ5000219904992',
  expiresAt: new Date(Date.now() + 60 * 86400000)
})

await ApprovalRequest.create({
  businessCardId: bCard._id,
  requestedBy:    'Emeka Okafor',
  amount:         4500000,   // ₦45,000 in kobo
  merchant:       'Air Peace',
  reason:         'Flight to Abuja for Q1 sales meeting',
  status:         'pending'
})

// ── AI Insights ───────────────────────────────────────────────────────────────
await Insight.create({
  userId: alice._id,
  summary: "Your financial health is stable. You have kept subscriptions low, but shopping and transport expenses are trending upwards.",
  insights: [
    "Your highest spending category this month is Shopping.",
    "You have successfully avoided non-essential subscription renewals this month.",
    "A recent high-value transaction was flagged as a potential anomaly."
  ],
  recommendations: [
    "Consider setting a strict budget limit for weekend shopping.",
    "Top up your investment wallet using your surplus ledger balance.",
    "Review your recent flagged anomalies to confirm they were authorized."
  ],
  anomalies: ["Some transactions exceeded your typical spend limit for their categories."],
  savingsOpportunity: 15000,
  byCategory: {
    food: 4500000,
    transport: 2000000,
    subscriptions: 500000,
    utilities: 1500000,
    entertainment: 3500000,
    shopping: 6000000,
    other: 1000000
  },
  totalSpent: 19000000,
  financialScore: 82
})

// ── Transfers & Bills ────────────────────────────────────────────────────────
// 1. A transfer from Alice to her Landlord (GTBank Main)
const transferRef = randomUUID()
const aliceTransferTx = await Transaction.create({
  userId: alice._id,
  cardId: aliceDebit._id,
  pan: aliceDebit.pan,
  amount: 5000000, // ₦50,000
  type: 'transfer',
  category: 'transfer',
  merchant: '058', // GTB Bank Code
  narration: 'Rent for April 2026',
  reference: transferRef,
})

await Transfer.create({
  userId: alice._id,
  sourceCardId: aliceDebit._id,
  sourcePan: aliceDebit.pan,
  amount: 5000000,
  recipientBank: '058',
  recipientAccount: '0123456789',
  recipientName: 'Ade Landlord',
  narration: 'Rent for April 2026',
  reference: transferRef,
  transactionId: aliceTransferTx._id,
  status: 'success',
})

// 2. A DSTV bill payment from Alice's Zenith card
const billRef = randomUUID()
const billTx = await Transaction.create({
  userId: alice._id,
  cardId: alicePrepaid._id,
  pan: alicePrepaid.pan,
  amount: 1500000, // ₦15,000
  type: 'bill_payment',
  category: 'bills',
  merchant: 'DSTV',
  narration: 'DSTV Premium Subscription',
  reference: billRef,
})

await BillPayment.create({
  userId: alice._id,
  sourceCardId: alicePrepaid._id,
  sourcePan: alicePrepaid.pan,
  amount: 1500000,
  billerCode: 'DSTV',
  billerName: 'DSTV Nigeria',
  customerId: '1092837465', // Smartcard No.
  narration: 'DSTV Premium Subscription',
  reference: billRef,
  transactionId: billTx._id,
  status: 'success',
})

console.log('✅  Seed complete!')
console.log('   alice@example.com / Password123!')
console.log('   bob@example.com   / Password123!')

await mongoose.disconnect()

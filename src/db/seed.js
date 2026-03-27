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
  businessUserId: bob._id,
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

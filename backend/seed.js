/**
 * Seed script — populates MongoDB with sample users and transactions for demo.
 * Run: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const InvestigationLog = require('./models/InvestigationLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fraud_investigation';

const sampleUsers = [
  {
    name: 'Alice Chen',
    email: 'alice.chen@example.com',
    accountNumber: 'ACC-10001',
    riskProfile: 'low',
    accountBalance: 125000,
    kycStatus: 'verified',
  },
  {
    name: 'Bob Martinez',
    email: 'bob.martinez@example.com',
    accountNumber: 'ACC-10002',
    riskProfile: 'low',
    accountBalance: 78500,
    kycStatus: 'verified',
  },
  {
    name: 'Charlie Okonkwo',
    email: 'charlie.o@example.com',
    accountNumber: 'ACC-10003',
    riskProfile: 'medium',
    accountBalance: 234000,
    kycStatus: 'verified',
  },
  {
    name: 'Diana Petrov',
    email: 'diana.petrov@example.com',
    accountNumber: 'ACC-10004',
    riskProfile: 'high',
    accountBalance: 15200,
    kycStatus: 'expired',
  },
  {
    name: 'Ethan Nakamura',
    email: 'ethan.n@example.com',
    accountNumber: 'ACC-10005',
    riskProfile: 'low',
    accountBalance: 540000,
    kycStatus: 'verified',
  },
  {
    name: 'Fatima Al-Rashid',
    email: 'fatima.ar@example.com',
    accountNumber: 'ACC-10006',
    riskProfile: 'medium',
    accountBalance: 92300,
    kycStatus: 'verified',
  },
  {
    name: 'George Hammond',
    email: 'george.h@example.com',
    accountNumber: 'ACC-10007',
    riskProfile: 'low',
    accountBalance: 310000,
    kycStatus: 'verified',
  },
  {
    name: 'Hannah Kim',
    email: 'hannah.kim@example.com',
    accountNumber: 'ACC-10008',
    riskProfile: 'high',
    accountBalance: 4800,
    kycStatus: 'pending',
  },
];

const highRiskLocations = [
  { country: 'NG', city: 'Lagos' },
  { country: 'RU', city: 'Moscow' },
  { country: 'IR', city: 'Tehran' },
  { country: 'KP', city: 'Pyongyang' },
];

const normalLocations = [
  { country: 'US', city: 'New York' },
  { country: 'US', city: 'Los Angeles' },
  { country: 'GB', city: 'London' },
  { country: 'DE', city: 'Berlin' },
  { country: 'JP', city: 'Tokyo' },
  { country: 'SG', city: 'Singapore' },
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTransactions(users) {
  const types = ['wire', 'ach', 'card', 'crypto', 'internal'];
  const transactions = [];

  // Normal transactions
  for (let i = 0; i < 15; i++) {
    const sender = randomFrom(users);
    let receiver = randomFrom(users);
    while (receiver._id.equals(sender._id)) {
      receiver = randomFrom(users);
    }
    const loc = randomFrom(normalLocations);

    transactions.push({
      transactionId: `TXN-${Date.now()}-${i.toString().padStart(3, '0')}`,
      sender: sender._id,
      receiver: receiver._id,
      amount: parseFloat((Math.random() * 5000 + 50).toFixed(2)),
      currency: 'USD',
      type: randomFrom(types),
      location: { country: loc.country, city: loc.city, coordinates: { lat: 0, lng: 0 } },
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      deviceFingerprint: `FP-${Math.random().toString(36).substring(2, 10)}`,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      status: 'completed',
    });
  }

  // Suspicious transactions (high amounts, high-risk locations, rapid succession)
  const suspiciousSender = users.find((u) => u.riskProfile === 'high') || users[3];

  // Large wire transfer
  transactions.push({
    transactionId: `TXN-SUS-001`,
    sender: suspiciousSender._id,
    receiver: randomFrom(users.filter((u) => !u._id.equals(suspiciousSender._id)))._id,
    amount: 52000,
    currency: 'USD',
    type: 'wire',
    location: { country: 'NG', city: 'Lagos', coordinates: { lat: 6.5244, lng: 3.3792 } },
    ipAddress: '41.190.2.101',
    deviceFingerprint: 'FP-suspicious-001',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'flagged',
  });

  // Rapid small transactions (structuring pattern)
  for (let i = 0; i < 5; i++) {
    transactions.push({
      transactionId: `TXN-SUS-RAPID-${i}`,
      sender: suspiciousSender._id,
      receiver: randomFrom(users.filter((u) => !u._id.equals(suspiciousSender._id)))._id,
      amount: parseFloat((Math.random() * 2000 + 8000).toFixed(2)), // Just under $10,000
      currency: 'USD',
      type: 'ach',
      location: { country: 'US', city: 'Miami', coordinates: { lat: 25.7617, lng: -80.1918 } },
      ipAddress: '98.137.11.42',
      deviceFingerprint: 'FP-suspicious-002',
      timestamp: new Date(Date.now() - (i * 10 + 5) * 60 * 1000), // 5-55 minutes apart
      status: 'flagged',
    });
  }

  // Crypto to high-risk jurisdiction
  transactions.push({
    transactionId: `TXN-SUS-CRYPTO-001`,
    sender: users.find((u) => u.riskProfile === 'medium') || users[2],
    receiver: randomFrom(users)._id,
    amount: 28750,
    currency: 'USD',
    type: 'crypto',
    location: { country: 'RU', city: 'Moscow', coordinates: { lat: 55.7558, lng: 37.6173 } },
    ipAddress: '95.173.136.70',
    deviceFingerprint: 'FP-crypto-anon',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    status: 'flagged',
  });

  // Fix sender for crypto transaction (should be ObjectId)
  const cryptoTx = transactions[transactions.length - 1];
  if (cryptoTx.sender._id) cryptoTx.sender = cryptoTx.sender._id;

  return transactions;
}

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Transaction.deleteMany({});
    await InvestigationLog.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create users
    const users = await User.insertMany(sampleUsers);
    console.log(`👤 Created ${users.length} users`);

    // Create transactions
    const txData = generateTransactions(users);
    const transactions = await Transaction.insertMany(txData);
    console.log(`💳 Created ${transactions.length} transactions`);

    // Link transactions to user histories
    for (const tx of transactions) {
      await User.findByIdAndUpdate(tx.sender, {
        $push: { transactionHistory: tx._id },
      });
      await User.findByIdAndUpdate(tx.receiver, {
        $push: { transactionHistory: tx._id },
      });
    }
    console.log('🔗 Linked transactions to user histories');

    console.log('\n✅ Seed completed successfully!');
    console.log(`   Users: ${users.length}`);
    console.log(`   Transactions: ${transactions.length}`);
    console.log(`   Flagged: ${transactions.filter((t) => t.status === 'flagged').length}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();

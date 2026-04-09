/**
 * Generate investigation data by sending flagged transactions through the ML pipeline.
 * Run: node seed-investigations.js
 * Requires: Express server on :3001 and FastAPI server on :8000
 */
const axios = require('axios');

const API = 'http://localhost:3001/api';

async function seedInvestigations() {
  try {
    // Get users
    const usersRes = await axios.get(`${API}/users`);
    const users = usersRes.data.data;
    if (users.length < 2) {
      console.log('❌ Not enough users. Run "npm run seed" first.');
      return;
    }

    console.log(`👤 Found ${users.length} users`);

    // Pick different sender/receiver pairs
    const highRiskUser = users.find(u => u.riskProfile === 'high') || users[0];
    const medRiskUser = users.find(u => u.riskProfile === 'medium') || users[1];
    const lowRiskUsers = users.filter(u => u.riskProfile === 'low');

    const suspiciousTransactions = [
      // 1. Large wire to Nigeria (critical risk)
      {
        sender: highRiskUser._id,
        receiver: lowRiskUsers[0]?._id || users[1]._id,
        amount: 52000,
        type: 'wire',
        location: { country: 'NG', city: 'Lagos' },
        ipAddress: '41.190.2.101',
        deviceFingerprint: 'FP-SUS-001',
      },
      // 2. Crypto to Russia (high risk)
      {
        sender: medRiskUser._id,
        receiver: lowRiskUsers[1]?._id || users[0]._id,
        amount: 28750,
        type: 'crypto',
        location: { country: 'RU', city: 'Moscow' },
        ipAddress: '95.173.136.70',
        deviceFingerprint: 'FP-CRYPTO-001',
      },
      // 3. Structuring pattern — just under $10k (high risk)
      {
        sender: highRiskUser._id,
        receiver: lowRiskUsers[0]?._id || users[1]._id,
        amount: 9800,
        type: 'ach',
        location: { country: 'US', city: 'Miami' },
        ipAddress: '98.137.11.42',
        deviceFingerprint: 'FP-STRUCT-001',
      },
      // 4. Normal domestic transaction (low risk)
      {
        sender: lowRiskUsers[0]?._id || users[0]._id,
        receiver: lowRiskUsers[1]?._id || users[1]._id,
        amount: 250,
        type: 'card',
        location: { country: 'US', city: 'New York' },
        ipAddress: '192.168.1.100',
        deviceFingerprint: 'FP-NORMAL-001',
      },
      // 5. Large internal transfer (medium risk)
      {
        sender: medRiskUser._id,
        receiver: lowRiskUsers[0]?._id || users[1]._id,
        amount: 15000,
        type: 'internal',
        location: { country: 'US', city: 'Los Angeles' },
        ipAddress: '10.0.0.50',
        deviceFingerprint: 'FP-INTERNAL-001',
      },
    ];

    console.log(`📤 Creating ${suspiciousTransactions.length} transactions through the ML pipeline...\n`);

    for (let i = 0; i < suspiciousTransactions.length; i++) {
      const tx = suspiciousTransactions[i];
      try {
        const res = await axios.post(`${API}/transactions`, tx);
        const inv = res.data.investigation;
        console.log(`✅ Transaction ${i + 1}/${suspiciousTransactions.length}: $${tx.amount.toLocaleString()} ${tx.type}`);
        if (inv) {
          console.log(`   → Risk: ${inv.riskLevel} (${inv.riskScore}) | Action: ${inv.recommendedAction}`);
        } else {
          console.log(`   → No investigation (ML service might be down)`);
        }
        console.log();
      } catch (err) {
        console.error(`❌ Transaction ${i + 1} failed:`, err.response?.data?.error || err.message);
      }
    }

    console.log('✅ Investigation seeding complete!');
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

seedInvestigations();

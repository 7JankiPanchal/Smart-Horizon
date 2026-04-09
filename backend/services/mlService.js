/**
 * ML Service Integration
 * Communicates with the Python FastAPI microservice to trigger
 * the multi-agent fraud investigation pipeline.
 */
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT_MS = 30000; // 30 second timeout

const mlClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Check if the ML service is healthy.
 * @returns {Promise<boolean>}
 */
async function checkHealth() {
  try {
    const response = await mlClient.get('/health');
    return response.data.status === 'healthy';
  } catch (error) {
    console.error('❌ ML Service health check failed:', error.message);
    return false;
  }
}

/**
 * Send a transaction to the ML service for investigation.
 * Formats the transaction data to match the FastAPI input schema.
 *
 * @param {Object} transaction - Populated Mongoose transaction document
 * @returns {Promise<Object>} Investigation result from the ML pipeline
 */
async function investigateTransaction(transaction) {
  // Format the payload to match FastAPI's TransactionInput schema
  const payload = {
    transactionId: transaction.transactionId,
    sender: {
      name: transaction.sender?.name || '',
      email: transaction.sender?.email || '',
      accountNumber: transaction.sender?.accountNumber || '',
      riskProfile: transaction.sender?.riskProfile || 'low',
      accountBalance: transaction.sender?.accountBalance || 0,
      kycStatus: transaction.sender?.kycStatus || 'verified',
    },
    receiver: {
      name: transaction.receiver?.name || '',
      email: transaction.receiver?.email || '',
      accountNumber: transaction.receiver?.accountNumber || '',
      riskProfile: transaction.receiver?.riskProfile || 'low',
      accountBalance: transaction.receiver?.accountBalance || 0,
      kycStatus: transaction.receiver?.kycStatus || 'verified',
    },
    amount: transaction.amount,
    currency: transaction.currency || 'USD',
    type: transaction.type,
    location: {
      country: transaction.location?.country || 'US',
      city: transaction.location?.city || '',
    },
    ipAddress: transaction.ipAddress || '',
    deviceFingerprint: transaction.deviceFingerprint || '',
    timestamp: transaction.timestamp
      ? new Date(transaction.timestamp).toISOString()
      : new Date().toISOString(),
    status: transaction.status || 'pending',
  };

  try {
    console.log(`🔍 Sending transaction ${transaction.transactionId} to ML service...`);
    const response = await mlClient.post('/investigate', payload);
    console.log(
      `✅ Investigation complete for ${transaction.transactionId} — ` +
        `Risk: ${response.data.riskLevel} (${response.data.riskScore}), ` +
        `Action: ${response.data.recommendedAction}`
    );
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ ML Service is not running. Start it with: cd ml-service && python main.py');
    } else if (error.code === 'ECONNABORTED') {
      console.error('❌ ML Service timed out after', TIMEOUT_MS, 'ms');
    } else {
      console.error('❌ ML Service error:', error.response?.data || error.message);
    }

    // Return a fallback result so the system doesn't crash
    return {
      riskScore: 50,
      riskLevel: 'medium',
      anomalyFlags: ['ML_SERVICE_UNAVAILABLE'],
      contextSummary: {},
      complianceViolations: [],
      explanation:
        'The ML investigation service is currently unavailable. ' +
        'This transaction has been flagged for manual review.',
      recommendedAction: 'monitor',
      agentLogs: [
        {
          agentName: 'System',
          status: 'error',
          output: { error: error.message },
          executionTimeMs: 0,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}

module.exports = { checkHealth, investigateTransaction };

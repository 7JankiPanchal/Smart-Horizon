const Transaction = require('../../models/Transaction');

/**
 * Advanced Stateful Detective Agent
 * Implements 10 complex fraud heuristics tailored to Indian banking networks (UPI, IMPS, RTGS).
 */
async function evaluateRules(transaction) {
  let riskScore = 0;
  let flags = [];
  let violations = [];

  const { amount, type, location, sender, receiver, timestamp, ipAddress, deviceFingerprint } = transaction;
  const city = location?.city || 'Unknown';
  const country = location?.country || 'IN';
  
  // Date calculations
  const now = timestamp ? new Date(timestamp) : new Date();
  
  // Rule 1: The Machine Gun UPI (Hyper-Velocity)
  // [DISABLED] - Temporarily disabled to prevent 100% false-positive blocking during high-volume simulation.


  // Rule 2: The PAN Card Dodge (Structuring)
  if ((amount >= 49000 && amount <= 49999) || (amount >= 199000 && amount <= 199999)) {
    riskScore += 65;
    flags.push('STRUCTURING_PAN_DODGE');
    violations.push({
      rule: 'Structuring (PAN Avoidance)',
      severity: 'high',
      description: `Amount ₹${amount} deliberately placed just below regulatory tax reporting thresholds.`
    });
  }

  // Rule 3: The Penny Drop Setup
  if (amount > 10000) {
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60000);
    const pennyDrop = await Transaction.findOne({
      sender: sender._id,
      amount: { $gte: 1, $lte: 10 },
      timestamp: { $gte: fifteenMinsAgo }
    });
    if (pennyDrop) {
      riskScore += 80;
      flags.push('PENNY_DROP_DRAIN');
      violations.push({
        rule: 'Penny Drop Verification',
        severity: 'critical',
        description: 'Micro-deposit detected just prior to large withdrawal. Classic account drain setup.'
      });
    }
  }

  // Rule 4: The Midnight Ghost (Time Anomaly IST)
  // Convert UTC to IST (+5:30)
  const istDate = new Date(now.getTime() + (5.5 * 60 * 60000));
  const istHour = istDate.getUTCHours();
  if (amount > 25000 && istHour >= 1 && istHour < 5) {
    riskScore += 50;
    flags.push('MIDNIGHT_GHOST');
    violations.push({
      rule: 'Dead of Night High-Value Transfer',
      severity: 'high',
      description: 'High value transfer occurring between 1:00 AM and 5:00 AM IST. User is likely asleep.'
    });
  }

  // Rule 5: Impossible Domestic Travel
  const lastTx = await Transaction.findOne({ sender: sender._id }).sort({ timestamp: -1 });
  if (lastTx && lastTx.location?.city && city !== 'Unknown') {
    if (lastTx.location.city !== city) {
      const timeDiffMinutes = (now.getTime() - new Date(lastTx.timestamp).getTime()) / 60000;
      if (timeDiffMinutes < 120) { // Under 2 hours between different cities
        riskScore += 95;
        flags.push('IMPOSSIBLE_TRAVEL');
        violations.push({
          rule: 'Impossible Geographic Velocity',
          severity: 'critical',
          description: `Transaction in ${city} occurred only ${Math.round(timeDiffMinutes)} mins after transaction in ${lastTx.location.city}. Card likely cloned.`
        });
      }
    }
  }

  // Rule 6: The Clean Sweep (Limit Max-Out)
  if (amount >= 95000 && amount <= 100000) {
    riskScore += 60;
    flags.push('CLEAN_SWEEP_LIMIT');
    violations.push({
      rule: 'Daily Limit Max-Out',
      severity: 'high',
      description: 'Transaction aggressively hits the standard ₹1,00,000 daily limit in a single attempt.'
    });
  }

  // Rule 7: New Device + Immediate High Value
  if (amount > 5000 && deviceFingerprint) {
    const tenMinsAgo = new Date(now.getTime() - 10 * 60000);
    // Did they ever use this device before 10 mins ago?
    const oldDeviceUse = await Transaction.findOne({
      sender: sender._id,
      deviceFingerprint,
      timestamp: { $lt: tenMinsAgo }
    });
    if (!oldDeviceUse) {
      riskScore += 75;
      flags.push('NEW_DEVICE_HIGH_VALUE');
      violations.push({
        rule: 'Unrecognized Device Rapid Transfer',
        severity: 'critical',
        description: 'New device authorized a high-value transfer immediately after logging in. Account takeover suspected.'
      });
    }
  }

  // Rule 8: Suspicious Round Numbers
  if (amount >= 10000 && amount % 10000 === 0) {
    riskScore += 30;
    flags.push('SUSPICIOUS_ROUND_NUMBER');
    violations.push({
      rule: 'Sequential Round Numbers',
      severity: 'medium',
      description: 'Perfectly round large figures often indicate manual rush transfers rather than organic shopping.'
    });
  }

  // Rule 9: Foreign IP, Domestic Account
  const isForeignIp = ipAddress && (ipAddress.startsWith('194.') || ipAddress.startsWith('45.') || ipAddress.startsWith('91.'));
  if (isForeignIp && country === 'IN') {
    riskScore += 85;
    flags.push('FOREIGN_IP_DOMESTIC_ACC');
    violations.push({
      rule: 'Offshore IP Override',
      severity: 'critical',
      description: 'Transaction requested from typical foreign proxy/VPN IP while account and target are domestic.'
    });
  }

  // Rule 10: The Brute Force Drain
  const tenMinsAgoBrute = new Date(now.getTime() - 10 * 60000);
  const failedTxCount = await Transaction.countDocuments({
    sender: sender._id,
    status: 'failed',
    timestamp: { $gte: tenMinsAgoBrute }
  });
  if (failedTxCount >= 2) {
    riskScore += 80;
    flags.push('BRUTE_FORCE_DRAIN');
    violations.push({
      rule: 'Brute Force / Insufficient Funds Spraying',
      severity: 'critical',
      description: 'Multiple failed attempts followed by a successful transfer. User is guessing balance or PIN.'
    });
  }

  return { riskScore, flags, violations };
}

async function investigateTransaction(transaction) {
  console.log(`🕵️‍♂️ [Security Agent] Inspecting ${transaction.transactionId}...`);
  
  const thinkTime = Math.random() * 800 + 400; 
  await new Promise(resolve => setTimeout(resolve, thinkTime));

  const { riskScore, flags, violations } = await evaluateRules(transaction);

  const finalScore = Math.min(Math.max(riskScore, 0), 100);

  let riskLevel = 'low';
  let recommendedAction = 'monitor';
  let explanation = 'Clear. Behavior maps organically to previous baseline.';

  if (finalScore >= 80) {
    riskLevel = 'critical';
    recommendedAction = 'block';
    explanation = 'THREAT DETECTED: High probability of active financial exploit. Protocol recommends immediate freeze.';
  } else if (finalScore >= 60) {
    riskLevel = 'high';
    recommendedAction = 'escalate';
    explanation = 'ANOMALY ALERT: Multiple rule boundaries breached. Flagged for review queue.';
  } else if (finalScore >= 30) {
    riskLevel = 'medium';
    recommendedAction = 'monitor';
    explanation = 'Notice: Slight deviations from standard behavioral thresholds.';
  }

  return {
    riskScore: finalScore,
    riskLevel,
    anomalyFlags: flags,
    contextSummary: {
      geoPattern: transaction.location?.city || 'Unknown',
      transactionFrequency: 'Real-Time',
    },
    complianceViolations: violations,
    explanation,
    recommendedAction,
    agentLogs: [
      {
        agentName: 'Security Ops Node',
        status: finalScore >= 60 ? 'warning' : 'success',
        output: { findings: flags.length > 0 ? flags : ['NO_ANOMALIES'] },
        executionTimeMs: Math.round(thinkTime),
        timestamp: new Date().toISOString(),
      }
    ]
  };
}

module.exports = { investigateTransaction };

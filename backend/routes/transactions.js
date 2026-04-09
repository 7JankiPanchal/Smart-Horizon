const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const InvestigationLog = require('../models/InvestigationLog');
const { investigateTransaction } = require('../services/agents/detectiveAgent');
const eventEmitter = require('../services/eventEmitter');

// GET /api/transactions/stream — SSE for real-time updates
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send an initial ping
  res.write(`data: ${JSON.stringify({ type: 'ping', message: 'Connected to live stream' })}\n\n`);

  const onTransaction = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  const onInvestigation = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  eventEmitter.on('new_transaction', onTransaction);
  eventEmitter.on('new_investigation', onInvestigation);

  req.on('close', () => {
    eventEmitter.off('new_transaction', onTransaction);
    eventEmitter.off('new_investigation', onInvestigation);
  });
});

// GET /api/transactions — List transactions with pagination & filters
router.get('/', async (req, res, next) => {
  try {
    const {
      status,
      type,
      minAmount,
      maxAmount,
      limit = 50,
      page = 1,
      sortBy = 'timestamp',
      order = 'desc',
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = parseFloat(minAmount);
      if (maxAmount) filter.amount.$lte = parseFloat(maxAmount);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;
    const total = await Transaction.countDocuments(filter);

    const transactions = await Transaction.find(filter)
      .populate('sender', 'name email accountNumber riskProfile')
      .populate('receiver', 'name email accountNumber riskProfile')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/transactions/:id — Get transaction by ID
router.get('/:id', async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('sender')
      .populate('receiver');

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    res.json({ success: true, data: transaction });
  } catch (err) {
    next(err);
  }
});

// POST /api/transactions — Create a new transaction
router.post('/', async (req, res, next) => {
  try {
    // Generate a unique transaction ID if not provided
    if (!req.body.transactionId) {
      req.body.transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    const transaction = await Transaction.create(req.body);

    // Add transaction to sender's and receiver's history
    await User.findByIdAndUpdate(transaction.sender, {
      $push: { transactionHistory: transaction._id },
    });
    await User.findByIdAndUpdate(transaction.receiver, {
      $push: { transactionHistory: transaction._id },
    });

    // Populate sender and receiver for the ML service and response
    await transaction.populate('sender');
    await transaction.populate('receiver');

    // Trigger ML investigation pipeline (non-blocking for the response)
    let investigation = null;
    
    // Skip investigation if the simulator explicitly forces a failure (Brute Force scenario)
    if (transaction.status !== 'failed') {
      try {
        const mlResult = await investigateTransaction(transaction);

        // Save investigation log to MongoDB
        investigation = await InvestigationLog.create({
          transaction: transaction._id,
          riskScore: mlResult.riskScore,
          riskLevel: mlResult.riskLevel,
          anomalyFlags: mlResult.anomalyFlags || [],
          contextSummary: mlResult.contextSummary || {},
          reporterFindings: mlResult.reporterFindings || {},
          complianceViolations: mlResult.complianceViolations || [],
          explanation: mlResult.explanation || '',
          recommendedAction: mlResult.recommendedAction || 'monitor',
          agentLogs: mlResult.agentLogs || [],
          status: 'pending',
        });

        // Update transaction status based on Agent's verdict
        if (mlResult.riskScore >= 60) {
          await Transaction.findByIdAndUpdate(transaction._id, { status: 'flagged' });
          transaction.status = 'flagged';
        } else {
          await Transaction.findByIdAndUpdate(transaction._id, { status: 'completed' });
          transaction.status = 'completed';
        }

        console.log(`📋 Investigation saved for ${transaction.transactionId} (ID: ${investigation._id}) - Status: ${transaction.status}`);
      } catch (mlError) {
        console.error('⚠️ ML investigation failed, transaction saved without investigation:', mlError.message);
      }
    }

    const responsePayload = {
      success: true,
      data: transaction,
      investigation: investigation ? {
        _id: investigation._id,
        riskScore: investigation.riskScore,
        riskLevel: investigation.riskLevel,
        recommendedAction: investigation.recommendedAction,
      } : null,
    };
    
    // Broadcast events to all connected SSE clients
    eventEmitter.emit('new_transaction', { type: 'new_transaction', payload: transaction });
    if (investigation) {
      // Send the populated transaction along with the investigation so the UI can link them properly
      eventEmitter.emit('new_investigation', { 
        type: 'new_investigation', 
        payload: { ...investigation.toObject(), transaction } 
      });
    }

    res.status(201).json(responsePayload);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/transactions/:id/status — Update transaction status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['pending', 'completed', 'flagged', 'blocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: pending, completed, flagged, blocked',
      });
    }

    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate('sender', 'name email accountNumber')
      .populate('receiver', 'name email accountNumber');

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    res.json({ success: true, data: transaction });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

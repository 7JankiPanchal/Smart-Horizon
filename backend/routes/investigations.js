const express = require('express');
const router = express.Router();
const InvestigationLog = require('../models/InvestigationLog');
const Transaction = require('../models/Transaction');

// GET /api/investigations — List investigation logs with pagination
router.get('/', async (req, res, next) => {
  try {
    const {
      status,
      riskLevel,
      recommendedAction,
      limit = 50,
      page = 1,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (recommendedAction) filter.recommendedAction = recommendedAction;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;
    const total = await InvestigationLog.countDocuments(filter);

    const logs = await InvestigationLog.find(filter)
      .populate({
        path: 'transaction',
        populate: [
          { path: 'sender', select: 'name email accountNumber riskProfile' },
          { path: 'receiver', select: 'name email accountNumber riskProfile' },
        ],
      })
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: logs,
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

// GET /api/investigations/:id — Get investigation log by ID
router.get('/:id', async (req, res, next) => {
  try {
    const log = await InvestigationLog.findById(req.params.id).populate({
      path: 'transaction',
      populate: [
        { path: 'sender' },
        { path: 'receiver' },
      ],
    });

    if (!log) {
      return res.status(404).json({ success: false, error: 'Investigation log not found' });
    }

    res.json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/investigations/:id/action — Compliance officer takes action
router.patch('/:id/action', async (req, res, next) => {
  try {
    const { action, reviewedBy, reviewNotes } = req.body;

    if (!action || !['block', 'monitor', 'escalate', 'dismiss'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be one of: block, monitor, escalate, dismiss',
      });
    }

    // Update investigation log
    const log = await InvestigationLog.findByIdAndUpdate(
      req.params.id,
      {
        status: 'actioned',
        recommendedAction: action,
        reviewedBy: reviewedBy || 'Compliance Officer',
        reviewNotes: reviewNotes || '',
      },
      { new: true }
    ).populate('transaction');

    if (!log) {
      return res.status(404).json({ success: false, error: 'Investigation log not found' });
    }

    // Also update the transaction status based on the action
    let newTxStatus = 'completed';
    if (action === 'block') newTxStatus = 'blocked';
    else if (action === 'monitor' || action === 'escalate') newTxStatus = 'flagged';

    await Transaction.findByIdAndUpdate(log.transaction._id, { status: newTxStatus });

    res.json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

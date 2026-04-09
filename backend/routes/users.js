const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /api/users — List all users
router.get('/', async (req, res, next) => {
  try {
    const { riskProfile, kycStatus, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (riskProfile) filter.riskProfile = riskProfile;
    if (kycStatus) filter.kycStatus = kycStatus;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-transactionHistory');

    res.json({
      success: true,
      data: users,
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

// GET /api/users/:id — Get user by ID
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate({
      path: 'transactionHistory',
      options: { sort: { timestamp: -1 }, limit: 20 },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// POST /api/users — Create a new user
router.post('/', async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id — Update a user
router.put('/:id', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

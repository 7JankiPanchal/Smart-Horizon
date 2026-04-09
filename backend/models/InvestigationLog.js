const mongoose = require('mongoose');

const agentLogSchema = new mongoose.Schema(
  {
    agentName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'warning', 'error', 'critical'],
      default: 'success',
    },
    output: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    executionTimeMs: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const investigationLogSchema = new mongoose.Schema(
  {
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: [true, 'Transaction reference is required'],
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    anomalyFlags: {
      type: [String],
      default: [],
    },
    contextSummary: {
      averageTransactionAmount: { type: Number, default: 0 },
      transactionFrequency: { type: String, default: '' },
      knownMerchants: { type: [String], default: [] },
      geoPattern: { type: String, default: '' },
      accountAge: { type: String, default: '' },
      previousFlags: { type: Number, default: 0 },
    },
    reporterFindings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    complianceViolations: [
      {
        rule: { type: String, required: true },
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
          required: true,
        },
        description: { type: String, required: true },
      },
    ],
    explanation: {
      type: String,
      default: '',
    },
    recommendedAction: {
      type: String,
      enum: ['block', 'monitor', 'escalate', 'dismiss'],
      default: 'monitor',
    },
    agentLogs: {
      type: [agentLogSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'actioned'],
      default: 'pending',
    },
    reviewedBy: {
      type: String,
      default: '',
    },
    reviewNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
investigationLogSchema.index({ transaction: 1 });
investigationLogSchema.index({ riskScore: -1 });
investigationLogSchema.index({ riskLevel: 1 });
investigationLogSchema.index({ status: 1 });
investigationLogSchema.index({ recommendedAction: 1 });
investigationLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('InvestigationLog', investigationLogSchema);

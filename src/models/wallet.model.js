const mongoose = require('mongoose');
const { Schema } = mongoose;

const transactionSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'payment', 'refund', 'reward'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  description: String,
  metadata: {
    stripePaymentIntentId: String,
    stripeChargeId: String,
    productId: String,
    subscriptionId: String,
    reason: String
  },
  balanceBefore: Number,
  balanceAfter: Number
}, {
  timestamps: true
});

const subscriptionSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    enum: ['basic', 'premium', 'vip'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired'],
    default: 'active'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'wallet'],
    required: true
  },
  stripeSubscriptionId: String,
  lastPayment: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction'
  }
}, {
  timestamps: true
});

// Indexes
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ 'metadata.stripePaymentIntentId': 1 });

subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });
subscriptionSchema.index({ 'stripeSubscriptionId': 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = {
  Transaction,
  Subscription
}; 
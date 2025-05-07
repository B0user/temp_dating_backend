const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Transaction, Subscription } = require('../models/wallet.model');
const User = require('../models/user.model');
const { z } = require('zod');

const paymentIntentSchema = z.object({
  amount: z.number().min(1),
  currency: z.string().default('USD'),
  description: z.string().optional()
});

const subscriptionSchema = z.object({
  plan: z.enum(['basic', 'premium', 'vip']),
  paymentMethod: z.enum(['stripe', 'wallet'])
});

const purchaseSchema = z.object({
  amount: z.number().min(1),
  type: z.enum(['coins', 'mytaCoins'])
});

class WalletService {
  async createPaymentIntent(userId, amount, currency = 'USD', description = '') {
    try {
      const validatedData = paymentIntentSchema.parse({
        amount,
        currency,
        description
      });

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: validatedData.amount * 100, // Convert to cents
        currency: validatedData.currency,
        description: validatedData.description,
        metadata: {
          userId: userId.toString()
        }
      });

      return {
        clientSecret: paymentIntent.client_secret
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid payment data');
      }
      throw error;
    }
  }

  async handleSuccessfulPayment(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const userId = paymentIntent.metadata.userId;

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Create transaction
      const transaction = await Transaction.create({
        user: userId,
        type: 'deposit',
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency,
        status: 'completed',
        metadata: {
          stripePaymentIntentId: paymentIntentId,
          stripeChargeId: paymentIntent.charges.data[0].id
        },
        balanceBefore: user.wallet.balance,
        balanceAfter: user.wallet.balance + (paymentIntent.amount / 100)
      });

      // Update user's wallet balance
      user.wallet.balance += paymentIntent.amount / 100;
      await user.save();

      return transaction;
    } catch (error) {
      throw new Error('Error processing payment');
    }
  }

  async createSubscription(userId, plan, paymentMethod) {
    try {
      const validatedData = subscriptionSchema.parse({
        plan,
        paymentMethod
      });

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Calculate subscription amount and duration based on plan
      const planDetails = this.getPlanDetails(validatedData.plan);
      
      if (validatedData.paymentMethod === 'wallet') {
        // Check if user has enough balance
        if (user.wallet.balance < planDetails.amount) {
          throw new Error('Insufficient balance');
        }

        // Create transaction
        const transaction = await Transaction.create({
          user: userId,
          type: 'payment',
          amount: planDetails.amount,
          currency: user.wallet.currency,
          status: 'completed',
          metadata: {
            productId: 'subscription',
            subscriptionPlan: plan
          },
          balanceBefore: user.wallet.balance,
          balanceAfter: user.wallet.balance - planDetails.amount
        });

        // Update user's wallet balance
        user.wallet.balance -= planDetails.amount;
        user.isPremium = true;
        user.premiumExpiresAt = new Date(Date.now() + planDetails.duration);
        await user.save();

        // Create subscription record
        const subscription = await Subscription.create({
          user: userId,
          plan: validatedData.plan,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + planDetails.duration),
          paymentMethod: 'wallet',
          lastPayment: transaction._id
        });

        return subscription;
      } else {
        // Handle Stripe subscription
        const subscription = await stripe.subscriptions.create({
          customer: user.stripeCustomerId || await this.createStripeCustomer(user),
          items: [{ price: planDetails.stripePriceId }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent']
        });

        // Create subscription record
        const dbSubscription = await Subscription.create({
          user: userId,
          plan: validatedData.plan,
          status: 'pending',
          startDate: new Date(),
          endDate: new Date(Date.now() + planDetails.duration),
          paymentMethod: 'stripe',
          stripeSubscriptionId: subscription.id
        });

        return {
          subscription: dbSubscription,
          clientSecret: subscription.latest_invoice.payment_intent.client_secret
        };
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid subscription data');
      }
      throw error;
    }
  }

  async createStripeCustomer(user) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        userId: user._id.toString()
      }
    });

    user.stripeCustomerId = customer.id;
    await user.save();

    return customer.id;
  }

  getPlanDetails(plan) {
    const plans = {
      basic: {
        amount: 9.99,
        duration: 30 * 24 * 60 * 60 * 1000, // 30 days
        stripePriceId: process.env.STRIPE_BASIC_PRICE_ID
      },
      premium: {
        amount: 19.99,
        duration: 30 * 24 * 60 * 60 * 1000, // 30 days
        stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID
      },
      vip: {
        amount: 49.99,
        duration: 30 * 24 * 60 * 60 * 1000, // 30 days
        stripePriceId: process.env.STRIPE_VIP_PRICE_ID
      }
    };

    return plans[plan];
  }

  async getUserTransactions(userId, page = 1, limit = 20) {
    try {
      const transactions = await Transaction.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Transaction.countDocuments({ user: userId });

      return {
        transactions,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error('Error getting user transactions');
    }
  }

  async getUserSubscription(userId) {
    try {
      const subscription = await Subscription.findOne({
        user: userId,
        status: 'active'
      });

      return subscription;
    } catch (error) {
      throw new Error('Error getting user subscription');
    }
  }

  async purchaseCoins(userId, amount, type) {
    try {
      const validatedData = purchaseSchema.parse({
        amount,
        type
      });
      console.log('userId', userId);

      const user = await User.findById(userId);
      console.log('user', user);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Create transaction
      const transaction = await Transaction.create({
        user: userId,
        type: 'deposit',
        amount: validatedData.amount,
        currency: validatedData.type,
        status: 'completed',
        metadata: {
          purchaseType: validatedData.type
        }
      });

      // Update user's wallet balance while preserving other fields
      const update = {};
      if (validatedData.type === 'coins') {
        update['wallet.coins'] = (user.wallet.coins || 0) + validatedData.amount;
      } else {
        update['wallet.mytaCoins'] = (user.wallet.mytaCoins || 0) + validatedData.amount;
      }

      // Use findByIdAndUpdate to only update the wallet fields
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: update },
        { new: true }
      );

      return {
        transaction,
        newBalance: updatedUser.wallet
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid purchase data');
      }
      throw error;
    }
  }

  async getUserBalance(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        coins: user.wallet.coins || 0,
        mytaCoins: user.wallet.mytaCoins || 0
      };
    } catch (error) {
      throw new Error('Error getting user balance');
    }
  }
}

module.exports = new WalletService(); 
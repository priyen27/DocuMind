import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const PLAN_AMOUNTS = {
  pro: 900, // ₹9 in paise (smallest currency unit)
  legend: 1500, // ₹15 in paise
};

export const PLAN_IDS = {
  pro: process.env.RAZORPAY_PRO_PLAN_ID,
  legend: process.env.RAZORPAY_LEGEND_PLAN_ID,
};

/**
 * Create a subscription for the user
 * @param {string} planId - The plan ID (pro/legend)
 * @param {string} userId - The user ID
 * @param {string} userEmail - The user's email
 * @param {string} userName - The user's name
 * @param {string} userPhone - The user's phone (optional)
 */
export async function createSubscription(planId, userId, userEmail, userName, userPhone = null) {
  try {
    // First create a customer
    const customer = await razorpay.customers.create({
      name: userName || userEmail.split('@')[0],
      email: userEmail,
      contact: userPhone || undefined,
      notes: {
        user_id: userId,
      },
    });

    // Create subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: PLAN_IDS[planId],
      customer_notify: 1,
      quantity: 1,
      total_count: 12, // 12 months
      addons: [],
      notes: {
        user_id: userId,
        plan: planId,
      },
      notify_info: {
        notify_phone: userPhone || undefined,
        notify_email: userEmail,
      },
    });

    return {
      subscription,
      customer,
    };
  } catch (error) {
    console.error('Error creating Razorpay subscription:', error);
    throw error;
  }
}

/**
 * Create a one-time payment order
 * @param {string} planId - The plan ID (pro/legend)
 * @param {string} userId - The user ID
 * @param {string} userEmail - The user's email
 * @param {string} userName - The user's name
 */
export async function createPaymentOrder(planId, userId, userEmail, userName) {
  try {
    const amount = PLAN_AMOUNTS[planId];
    
    if (!amount) {
      throw new Error('Invalid plan ID');
    }

    const order = await razorpay.orders.create({
      amount: amount,
      currency: 'INR',
      receipt: `order_${userId}_${Date.now()}`,
      notes: {
        user_id: userId,
        plan: planId,
        email: userEmail,
        name: userName,
      },
    });

    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
}

/**
 * Verify payment signature
 * @param {string} orderId - The order ID
 * @param {string} paymentId - The payment ID
 * @param {string} signature - The signature from Razorpay
 */
export function verifyPaymentSignature(orderId, paymentId, signature) {
  const crypto = require('crypto');
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Get subscription details
 * @param {string} subscriptionId - The subscription ID
 */
export async function getSubscription(subscriptionId) {
  try {
    return await razorpay.subscriptions.fetch(subscriptionId);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw error;
  }
}

/**
 * Cancel subscription
 * @param {string} subscriptionId - The subscription ID
 * @param {boolean} cancelAtCycleEnd - Whether to cancel at cycle end
 */
export async function cancelSubscription(subscriptionId, cancelAtCycleEnd = true) {
  try {
    return await razorpay.subscriptions.cancel(subscriptionId, {
      cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0,
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Get payment details
 * @param {string} paymentId - The payment ID
 */
export async function getPayment(paymentId) {
  try {
    return await razorpay.payments.fetch(paymentId);
  } catch (error) {
    console.error('Error fetching payment:', error);
    throw error;
  }
}

/**
 * Verify webhook signature
 * @param {string} body - The webhook body
 * @param {string} signature - The signature header
 */
export function verifyWebhookSignature(body, signature) {
  const crypto = require('crypto');
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return `sha256=${expectedSignature}` === signature;
}

export default razorpay;
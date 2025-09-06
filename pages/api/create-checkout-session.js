import { createPaymentOrder, createSubscription } from '../../lib/razorpay';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { planId, userId, paymentType = 'order' } = req.body;

    if (!planId || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (!['pro', 'legend'].includes(planId)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, name, razorpay_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(400).json({ error: 'User not found' });
    }

    let result;

    if (paymentType === 'subscription') {
      // Create subscription (recurring payments)
      result = await createSubscription(
        planId,
        userId,
        user.email,
        user.name || user.email.split('@')[0]
      );

      // Store customer ID in database
      if (result.customer && !user.razorpay_customer_id) {
        await supabase
          .from('users')
          .update({
            razorpay_customer_id: result.customer.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      }

      res.status(200).json({
        type: 'subscription',
        subscriptionId: result.subscription.id,
        customerId: result.customer.id,
        status: result.subscription.status,
        shortUrl: result.subscription.short_url,
      });

    } else {
      // Create one-time payment order
      result = await createPaymentOrder(
        planId,
        userId,
        user.email,
        user.name || user.email.split('@')[0]
      );

      res.status(200).json({
        type: 'order',
        orderId: result.id,
        amount: result.amount,
        currency: result.currency,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        userEmail: user.email,
        userName: user.name || user.email.split('@')[0],
        planId: planId,
        userId: userId,
      });
    }

  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    });
  }
}
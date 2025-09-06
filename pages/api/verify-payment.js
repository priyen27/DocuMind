import { verifyPaymentSignature, getPayment } from '../../lib/razorpay';
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
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      userId,
      planId 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId || !planId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Verify payment signature
    const isValidSignature = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Get payment details from Razorpay
    const paymentDetails = await getPayment(razorpay_payment_id);

    if (paymentDetails.status !== 'captured') {
      return res.status(400).json({ error: 'Payment not successful' });
    }

    // Update user subscription in database
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1); // 1 month subscription

    const { error: userError } = await supabase
      .from('users')
      .update({
        subscription_tier: planId,
        subscription_status: 'active',
        razorpay_payment_id: razorpay_payment_id,
        razorpay_order_id: razorpay_order_id,
        subscription_ends_at: subscriptionEndDate.toISOString(),
        daily_prompts_used: 0, // Reset usage
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (userError) {
      console.error('Error updating user:', userError);
      return res.status(500).json({ error: 'Failed to update subscription' });
    }

    // Record payment transaction
    await supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        razorpay_payment_id: razorpay_payment_id,
        razorpay_order_id: razorpay_order_id,
        amount: paymentDetails.amount / 100, // Convert paise to rupees
        currency: paymentDetails.currency,
        status: 'succeeded',
        payment_method: paymentDetails.method,
        description: `Payment for ${planId} plan`,
        metadata: {
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          plan: planId,
        }
      });

    // Record subscription history
    await supabase
      .from('subscription_history')
      .insert({
        user_id: userId,
        subscription_tier: planId,
        status: 'active',
        started_at: new Date().toISOString(),
        amount_paid: paymentDetails.amount / 100,
        currency: paymentDetails.currency,
      });

    // Reset usage tracking for today
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('usage_tracking')
      .upsert({
        user_id: userId,
        usage_date: today,
        prompts_used: 0,
        files_uploaded: 0,
        analysis_generated: 0,
        tier_at_time: planId,
      });

    console.log(`Successfully upgraded user ${userId} to ${planId}`);

    res.status(200).json({ 
      success: true, 
      message: 'Payment verified and subscription updated',
      subscription: {
        tier: planId,
        status: 'active',
        endsAt: subscriptionEndDate.toISOString()
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      error: 'Payment verification failed',
      details: error.message 
    });
  }
}
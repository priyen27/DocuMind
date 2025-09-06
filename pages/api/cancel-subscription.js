import { cancelSubscription, getSubscription } from '../../lib/razorpay';
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
    const { userId, cancelAtCycleEnd = true } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('razorpay_subscription_id, subscription_tier')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(400).json({ error: 'User not found' });
    }

    if (!user.razorpay_subscription_id) {
      // If no active subscription, just downgrade to free
      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_tier: 'free',
          subscription_status: 'canceled',
          subscription_ends_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        return res.status(500).json({ error: 'Failed to update subscription' });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Subscription downgraded to free' 
      });
    }

    // Cancel Razorpay subscription
    const canceledSubscription = await cancelSubscription(
      user.razorpay_subscription_id,
      cancelAtCycleEnd
    );

    // Update user status
    const subscriptionEndDate = cancelAtCycleEnd 
      ? new Date(canceledSubscription.current_end * 1000)
      : new Date();

    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_tier: cancelAtCycleEnd ? user.subscription_tier : 'free',
        subscription_status: 'canceled',
        subscription_ends_at: subscriptionEndDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user after cancellation:', updateError);
      return res.status(500).json({ error: 'Failed to update subscription status' });
    }

    // Record subscription history
    await supabase
      .from('subscription_history')
      .insert({
        user_id: userId,
        subscription_tier: 'free',
        status: 'canceled',
        ended_at: subscriptionEndDate.toISOString(),
      });

    res.status(200).json({
      success: true,
      message: cancelAtCycleEnd 
        ? 'Subscription will be canceled at the end of the billing cycle'
        : 'Subscription canceled immediately',
      endsAt: subscriptionEndDate.toISOString(),
    });

  } catch (error) {
    console.error('Subscription cancellation error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel subscription',
      details: error.message 
    });
  }
}
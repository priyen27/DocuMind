import { verifyWebhookSignature, getPayment, getSubscription } from '../../lib/razorpay';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = await buffer(req);
  const signature = req.headers['x-razorpay-signature'];

  // Verify webhook signature
  const isValidSignature = verifyWebhookSignature(body.toString(), signature);
  
  if (!isValidSignature) {
    console.error('Invalid webhook signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(body.toString());
  console.log('Processing Razorpay webhook event:', event.event);

  try {
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;
      case 'subscription.activated':
        await handleSubscriptionActivated(event.payload.subscription.entity);
        break;
      case 'subscription.charged':
        await handleSubscriptionCharged(event.payload.subscription.entity, event.payload.payment.entity);
        break;
      case 'subscription.cancelled':
        await handleSubscriptionCanceled(event.payload.subscription.entity);
        break;
      case 'subscription.completed':
        await handleSubscriptionCompleted(event.payload.subscription.entity);
        break;
      case 'subscription.pending':
        await handleSubscriptionPending(event.payload.subscription.entity);
        break;
      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed', details: error.message });
  }
}

async function handlePaymentCaptured(payment) {
  console.log('Processing payment captured:', payment.id);
  
  try {
    const userId = payment.notes?.user_id;
    const planId = payment.notes?.plan;

    if (!userId || !planId) {
      console.error('Missing user_id or plan in payment notes');
      return;
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('User not found for payment:', userId);
      return;
    }

    // Update subscription if this is an upgrade
    if (user.subscription_tier !== planId) {
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_tier: planId,
          subscription_status: 'active',
          razorpay_payment_id: payment.id,
          razorpay_order_id: payment.order_id,
          subscription_ends_at: subscriptionEndDate.toISOString(),
          daily_prompts_used: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user subscription:', updateError);
        throw updateError;
      }

      // Record subscription history
      await recordSubscriptionHistory(userId, planId, 'active', null, payment);
    }

    // Record payment transaction
    await recordPaymentTransaction(userId, payment, 'succeeded');

    console.log(`Successfully processed payment for user ${userId}`);

  } catch (error) {
    console.error('Error handling payment captured:', error);
    throw error;
  }
}

async function handlePaymentFailed(payment) {
  console.log('Processing payment failed:', payment.id);
  
  try {
    const userId = payment.notes?.user_id;

    if (userId) {
      // Record failed payment transaction
      await recordPaymentTransaction(userId, payment, 'failed');

      // Optionally send notification to user about failed payment
      console.log(`Payment failed for user ${userId}:`, payment.error_description);
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

async function handleSubscriptionActivated(subscription) {
  console.log('Processing subscription activated:', subscription.id);
  
  try {
    const userId = subscription.notes?.user_id;
    const planId = subscription.notes?.plan;

    if (!userId || !planId) {
      console.error('Missing user_id or plan in subscription notes');
      return;
    }

    const subscriptionEndDate = new Date(subscription.current_end * 1000);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_tier: planId,
        subscription_status: 'active',
        razorpay_subscription_id: subscription.id,
        subscription_ends_at: subscriptionEndDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user subscription:', updateError);
      throw updateError;
    }

    // Record subscription history
    await recordSubscriptionHistory(userId, planId, 'active', subscription.id);

    console.log(`Successfully activated subscription for user ${userId}`);

  } catch (error) {
    console.error('Error handling subscription activated:', error);
    throw error;
  }
}

async function handleSubscriptionCharged(subscription, payment) {
  console.log('Processing subscription charged:', subscription.id);
  
  try {
    const userId = subscription.notes?.user_id;

    if (userId) {
      // Extend subscription period
      const subscriptionEndDate = new Date(subscription.current_end * 1000);

      await supabase
        .from('users')
        .update({
          subscription_ends_at: subscriptionEndDate.toISOString(),
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      // Record payment transaction
      if (payment) {
        await recordPaymentTransaction(userId, payment, 'succeeded');
      }

      console.log(`Successfully processed subscription charge for user ${userId}`);
    }
  } catch (error) {
    console.error('Error handling subscription charged:', error);
  }
}

async function handleSubscriptionCanceled(subscription) {
  console.log('Processing subscription canceled:', subscription.id);
  
  try {
    const userId = subscription.notes?.user_id;

    if (userId) {
      const subscriptionEndDate = new Date(subscription.end_at * 1000);

      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_tier: 'free',
          subscription_status: 'canceled',
          subscription_ends_at: subscriptionEndDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating canceled subscription:', updateError);
        throw updateError;
      }

      // Record subscription history
      await recordSubscriptionHistory(userId, 'free', 'canceled', subscription.id);

      console.log(`Successfully canceled subscription for user ${userId}`);
    }
  } catch (error) {
    console.error('Error handling subscription canceled:', error);
  }
}

async function handleSubscriptionCompleted(subscription) {
  console.log('Processing subscription completed:', subscription.id);
  
  try {
    const userId = subscription.notes?.user_id;

    if (userId) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_tier: 'free',
          subscription_status: 'completed',
          subscription_ends_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating completed subscription:', updateError);
        throw updateError;
      }

      // Record subscription history
      await recordSubscriptionHistory(userId, 'free', 'completed', subscription.id);

      console.log(`Successfully completed subscription for user ${userId}`);
    }
  } catch (error) {
    console.error('Error handling subscription completed:', error);
  }
}

async function handleSubscriptionPending(subscription) {
  console.log('Processing subscription pending:', subscription.id);
  
  try {
    const userId = subscription.notes?.user_id;

    if (userId) {
      await supabase
        .from('users')
        .update({
          subscription_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      console.log(`Subscription pending for user ${userId}`);
    }
  } catch (error) {
    console.error('Error handling subscription pending:', error);
  }
}

// Helper functions
async function recordPaymentTransaction(userId, payment, status) {
  try {
    await supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        razorpay_payment_id: payment.id,
        razorpay_order_id: payment.order_id,
        amount: payment.amount / 100, // Convert paise to rupees
        currency: payment.currency,
        status: status,
        payment_method: payment.method,
        description: payment.description || `Payment for ${payment.notes?.plan || 'subscription'}`,
        metadata: {
          payment_id: payment.id,
          order_id: payment.order_id,
          plan: payment.notes?.plan,
          error_code: payment.error_code,
          error_description: payment.error_description,
        }
      });
  } catch (error) {
    console.error('Error recording payment transaction:', error);
  }
}

async function recordSubscriptionHistory(userId, tier, status, subscriptionId, paymentData = null) {
  try {
    await supabase
      .from('subscription_history')
      .insert({
        user_id: userId,
        subscription_tier: tier,
        status: status,
        razorpay_subscription_id: subscriptionId,
        started_at: new Date().toISOString(),
        amount_paid: paymentData ? paymentData.amount / 100 : null,
        currency: paymentData ? paymentData.currency : 'INR',
      });
  } catch (error) {
    console.error('Error recording subscription history:', error);
  }
}
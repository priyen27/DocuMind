import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Create nodemailer transporter (reuse from your send.js)
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

// Email template for daily reminders
const getDailyReminderTemplate = (userName, remainingPrompts, totalPrompts, tier) => {
  return {
    subject: "Don't forget your daily prompts - Documind",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3B82F6; margin: 0;">Documind</h1>
        </div>
        <h2 style="color: #F59E0B;">Don't Miss Out! ⏰</h2>
        <p>Hi ${userName},</p>
        <p>You still have <strong>${remainingPrompts} out of ${totalPrompts}</strong> daily prompts available today!</p>
        
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #F59E0B; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Your ${tier} plan includes:</strong></p>
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin: 5px 0;">${totalPrompts} prompts per day</li>
            <li style="margin: 5px 0;">AI-powered file analysis</li>
            <li style="margin: 5px 0;">Smart document insights</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/chat" 
             style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Start Analyzing Files
          </a>
        </div>

        <p style="font-size: 12px; color: #6b7280;">
          You can disable these reminders in your <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/settings" style="color: #3B82F6;">account settings</a>.
        </p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          Best regards,<br>
          The Documind Team
        </p>
      </div>
    `
  };
};

export default async function handler(req, res) {
  console.log('=== Daily Reminders Cron Started ===');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Authentication for cron jobs
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('Unauthorized cron request');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Check if email service is configured
  if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Gmail credentials not configured');
    return res.status(500).json({ message: 'Email service not configured' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const dailyLimits = { free: 10, pro: 25, legend: 50 };

    console.log(`Processing daily reminders for ${today}`);

    // Get all users who have email notifications and prompt reminders enabled
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, subscription_tier, notification_settings')
      .not('notification_settings', 'is', null);

    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }

    console.log(`Found ${users?.length || 0} total users`);

    // Filter users who have prompt reminders enabled
    const eligibleUsers = (users || []).filter(user => {
      const settings = user.notification_settings || {};
      return settings.emailNotifications && settings.promptReminders;
    });

    console.log(`Found ${eligibleUsers.length} users with reminder preferences enabled`);

    // Get today's usage for all eligible users
    const userIds = eligibleUsers.map(u => u.id);
    
    let todayUsage = [];
    if (userIds.length > 0) {
      const { data: usageData, error: usageError } = await supabaseAdmin
        .from('daily_usage')
        .select('user_id, prompts_used')
        .in('user_id', userIds)
        .eq('date', today);

      if (usageError) {
        console.error('Error fetching usage data:', usageError);
        // Continue with empty usage data
      } else {
        todayUsage = usageData || [];
      }
    }

    // Create usage lookup
    const usageLookup = todayUsage.reduce((acc, usage) => {
      acc[usage.user_id] = usage.prompts_used || 0;
      return acc;
    }, {});

    // Find users who need reminders
    const remindersToSend = [];

    for (const user of eligibleUsers) {
      const userLimit = dailyLimits[user.subscription_tier] || 10;
      const usedPrompts = usageLookup[user.id] || 0;
      const remainingPrompts = userLimit - usedPrompts;

      // Only send reminder if user has unused prompts (and has used less than 80% of their limit)
      if (remainingPrompts > 0 && usedPrompts < (userLimit * 0.8)) {
        remindersToSend.push({
          userId: user.id,
          email: user.email,
          name: user.name || 'User',
          remainingPrompts,
          totalPrompts: userLimit,
          tier: user.subscription_tier || 'free'
        });
      }
    }

    console.log(`Found ${remindersToSend.length} users to send reminders to`);

    if (remindersToSend.length === 0) {
      return res.status(200).json({
        message: 'No reminders to send',
        stats: {
          totalUsers: users?.length || 0,
          eligibleUsers: eligibleUsers.length,
          remindersNeeded: 0
        }
      });
    }

    // Create transporter
    const transporter = createTransporter();

    // Send reminders directly (instead of calling API)
    const results = await Promise.allSettled(
      remindersToSend.map(async (reminder) => {
        try {
          const emailTemplate = getDailyReminderTemplate(
            reminder.name,
            reminder.remainingPrompts,
            reminder.totalPrompts,
            reminder.tier
          );

          const mailOptions = {
            from: `"Documind" <${process.env.GMAIL_EMAIL}>`,
            to: reminder.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
          };

          const result = await transporter.sendMail(mailOptions);
          
          // Log the notification
          await supabaseAdmin
            .from('notification_log')
            .insert({
              user_id: reminder.userId,
              email_type: 'dailyReminder',
              status: 'sent',
              email_address: reminder.email,
              subject: emailTemplate.subject,
              sent_at: new Date().toISOString()
            });

          console.log(`✅ Reminder sent to ${reminder.email}`);
          return { success: true, email: reminder.email, messageId: result.messageId };

        } catch (error) {
          console.error(`❌ Failed to send reminder to ${reminder.email}:`, error);
          
          // Log the failed notification
          await supabaseAdmin
            .from('notification_log')
            .insert({
              user_id: reminder.userId,
              email_type: 'dailyReminder',
              status: 'failed',
              email_address: reminder.email,
              error_message: error.message,
              sent_at: new Date().toISOString()
            });

          throw error;
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Daily reminders completed: ${successful} sent, ${failed} failed`);

    res.status(200).json({
      message: 'Daily reminders processed successfully',
      stats: {
        totalUsers: users?.length || 0,
        eligibleUsers: eligibleUsers.length,
        remindersNeeded: remindersToSend.length,
        successful,
        failed
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Daily reminders error:', error);
    res.status(500).json({ 
      message: 'Failed to process daily reminders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
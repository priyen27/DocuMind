import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

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

// Create nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

// Daily reminder email template
const getDailyReminderTemplate = (userName, remainingPrompts, totalPrompts, tier) => {
  const subject = `🧠 You have ${remainingPrompts} prompts remaining today!`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Daily Prompt Reminder - DocuMind</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { padding: 40px 20px; }
            .prompt-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center; }
            .prompt-number { font-size: 48px; font-weight: bold; color: #3b82f6; margin-bottom: 8px; }
            .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🧠 DocuMind</h1>
                <p style="color: #e0e7ff; margin: 10px 0 0 0;">Your AI Document Assistant</p>
            </div>
            
            <div class="content">
                <h2 style="color: #1f2937; margin-bottom: 20px;">Don't forget your daily prompts!</h2>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Hi ${userName}! 👋
                </p>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                    You still have unused prompts for today. Don't let them go to waste!
                </p>
                
                <div class="prompt-card">
                    <div class="prompt-number">${remainingPrompts}</div>
                    <p style="margin: 0; color: #64748b;">prompts remaining today</p>
                    <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px;">out of ${totalPrompts} total</p>
                </div>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Upload a document, ask questions, or get AI-powered insights. Your prompts reset at midnight, so use them while you can!
                </p>
                
                <div style="text-align: center;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/dashboard" class="cta-button">
                        Start Chatting →
                    </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0;">
                
                <p style="color: #9ca3af; font-size: 14px;">
                    💡 <strong>Quick ideas:</strong> Summarize a research paper, extract key points from meeting notes, 
                    or analyze financial reports. Your AI assistant is ready to help!
                </p>
            </div>
            
            <div class="footer">
                <p>You're receiving this because you enabled daily prompt reminders.</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/settings" style="color: #3b82f6;">Update preferences</a> | <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}" style="color: #3b82f6;">Visit DocuMind</a></p>
            </div>
        </div>
    </body>
    </html>
  `;
  
  return { subject, html };
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

  if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Gmail credentials not configured');
    return res.status(500).json({ message: 'Email service not configured' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const dailyLimits = { free: 10, pro: 25, legend: 50 };

    // Current UTC time - this cron should run at 4:30 UTC (10:00 AM IST)
    const now = new Date();
    console.log(`Processing reminders at ${now.toISOString()}`);

    // FIXED: Get all users with notification settings enabled
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, subscription_tier, notification_settings')
      .not('notification_settings', 'is', null);

    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }

    console.log(`Found ${users?.length || 0} total users`);

    // FIXED: Filter users with correct settings structure
    const eligibleUsers = (users || []).filter(user => {
      const settings = user.notification_settings || {};
      return (
        settings.emailNotifications === true &&
        settings.promptReminders === true
      );
    });

    console.log(`Eligible users for IST reminders: ${eligibleUsers.length}`);

    if (eligibleUsers.length === 0) {
      return res.status(200).json({
        message: 'No reminders needed for IST timezone',
        stats: { totalUsers: users?.length || 0, eligibleUsers: 0 },
        timestamp: new Date().toISOString(),
      });
    }

    // FIXED: Fetch usage data with correct column name
    const userIds = eligibleUsers.map(u => u.id);
    let todayUsage = [];
    if (userIds.length > 0) {
      const { data: usageData, error: usageError } = await supabaseAdmin
        .from('daily_usage')
        .select('user_id, prompts_used')
        .in('user_id', userIds)
        .eq('usage_date', today); // FIXED: Changed from 'date' to 'usage_date'

      if (usageError) {
        console.error('Error fetching usage data:', usageError);
        // Don't fail the entire process if usage data fetch fails
      } else {
        todayUsage = usageData || [];
      }
    }

    const usageLookup = todayUsage.reduce((acc, usage) => {
      acc[usage.user_id] = usage.prompts_used || 0;
      return acc;
    }, {});

    const remindersToSend = [];

    for (const user of eligibleUsers) {
      const userLimit = dailyLimits[user.subscription_tier] || 10;
      const usedPrompts = usageLookup[user.id] || 0;
      const remainingPrompts = userLimit - usedPrompts;

      // FIXED: Send reminder if user has remaining prompts and hasn't used 80% of daily limit
      if (remainingPrompts > 0 && usedPrompts < userLimit * 0.8) {
        remindersToSend.push({
          userId: user.id,
          email: user.email,
          name: user.name || 'User',
          remainingPrompts,
          totalPrompts: userLimit,
          tier: user.subscription_tier || 'free',
        });
      }
    }

    console.log(`Reminders to send: ${remindersToSend.length}`);

    if (remindersToSend.length === 0) {
      return res.status(200).json({
        message: 'No reminders needed - users have used most of their daily limits',
        stats: {
          totalUsers: users?.length || 0,
          eligibleUsers: eligibleUsers.length,
          remindersNeeded: 0,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const transporter = createTransporter();

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

          // FIXED: Log successful notification with correct timestamp
          await supabaseAdmin.from('notification_log').insert({
            user_id: reminder.userId,
            email_type: 'dailyReminder',
            status: 'sent',
            email_address: reminder.email,
            subject: emailTemplate.subject,
            sent_at: new Date().toISOString(),
          });

          console.log(`✅ Reminder sent to ${reminder.email}`);
          return { success: true, email: reminder.email, messageId: result.messageId };
        } catch (error) {
          console.error(`❌ Failed to send reminder to ${reminder.email}:`, error);

          // Log failed notification
          await supabaseAdmin.from('notification_log').insert({
            user_id: reminder.userId,
            email_type: 'dailyReminder',
            status: 'failed',
            email_address: reminder.email,
            error_message: error.message,
            sent_at: new Date().toISOString(),
          });

          throw error;
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Reminders completed: ${successful} sent, ${failed} failed`);

    res.status(200).json({
      message: 'Daily reminders processed for IST timezone',
      stats: {
        totalUsers: users?.length || 0,
        eligibleUsers: eligibleUsers.length,
        remindersNeeded: remindersToSend.length,
        successful,
        failed,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Reminder processing error:', error);
    res.status(500).json({
      message: 'Failed to process reminders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
}

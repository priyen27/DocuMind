// pages/api/reminder-service.js
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Email transporter setup (using your preferred email service)
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { userId, email, enabled } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      // Update user preferences
      const { error } = await supabase
        .from('users')
        .update({ preferences: { promptReminders: enabled } })
        .eq('id', userId);

      if (error) throw error;

      res.status(200).json({ success: true, message: 'Reminder service updated' });
    } catch (error) {
      console.error('Error updating reminder service:', error);
      res.status(500).json({ error: 'Failed to update reminder service' });
    }
  } else if (req.method === 'GET') {
    // This endpoint can be called by a cron job to send daily reminders
    try {
      await sendDailyReminders();
      res.status(200).json({ success: true, message: 'Daily reminders sent' });
    } catch (error) {
      console.error('Error sending daily reminders:', error);
      res.status(500).json({ error: 'Failed to send reminders' });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function sendDailyReminders() {
  try {
    // Get users with prompt reminders enabled
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, preferences, subscription_tier')
      .not('preferences->promptReminders', 'is', null)
      .eq('preferences->promptReminders', true);

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];

    for (const user of users) {
      try {
        // Check user's today usage
        const { data: todayUsage } = await supabase
          .from('daily_usage')
          .select('prompts_used')
          .eq('user_id', user.id)
          .eq('usage_date', today)
          .single();

        const promptsUsed = todayUsage?.prompts_used || 0;
        const planLimits = { free: 10, pro: 25, legend: 50 };
        const userLimit = planLimits[user.subscription_tier] || 10;
        const remainingPrompts = userLimit - promptsUsed;

        // Only send reminder if user has remaining prompts
        if (remainingPrompts > 0) {
          await sendReminderEmail(user, remainingPrompts, userLimit);
        }
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
      }
    }
  } catch (error) {
    console.error('Error in sendDailyReminders:', error);
    throw error;
  }
}

async function sendReminderEmail(user, remainingPrompts, totalLimit) {
  const emailTemplate = `
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
                Hi ${user.name || 'there'}! 👋
            </p>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                You still have unused prompts for today. Don't let them go to waste!
            </p>
            
            <div class="prompt-card">
                <div class="prompt-number">${remainingPrompts}</div>
                <p style="margin: 0; color: #64748b;">prompts remaining today</p>
                <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px;">out of ${totalLimit} total</p>
            </div>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Upload a document, ask questions, or get AI-powered insights. Your prompts reset at midnight, so use them while you can!
            </p>
            
            <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="cta-button">
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
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color: #3b82f6;">Update preferences</a> | <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #3b82f6;">Visit DocuMind</a></p>
        </div>
    </div>
</body>
</html>
`;

  const mailOptions = {
    from: `"DocuMind AI" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: user.email,
    subject: `🧠 You have ${remainingPrompts} prompts remaining today!`,
    html: emailTemplate,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reminder email sent to ${user.email}`);
    
    // Log the reminder in the database (optional)
    await supabase
      .from('daily_usage')
      .upsert({
        user_id: user.id,
        usage_date: new Date().toISOString().split('T')[0],
        features_used: { reminder_sent: true }
      }, {
        onConflict: 'user_id,usage_date',
        ignoreDuplicates: false
      });
  } catch (error) {
    console.error(`Failed to send reminder email to ${user.email}:`, error);
    throw error;
  }
}
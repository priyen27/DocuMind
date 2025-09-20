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

// Create nodemailer transporter - FIXED: changed createTransporter to createTransport
const createTransporter = () => {
  return nodemailer.createTransport({  // <-- FIXED: removed 'er' from createTransporter
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
    },
  });
};

// Inline email templates
const emailTemplates = {
  preferencesUpdated: {
    subject: 'Preferences Updated - Documind',
    getHtml: (userName) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3B82F6; margin: 0;">Documind</h1>
        </div>
        <h2 style="color: #3B82F6;">Preferences Updated Successfully! ✅</h2>
        <p>Hi ${userName},</p>
        <p>Your Documind preferences have been successfully updated. This confirms that your notification settings are now active.</p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3B82F6; margin: 20px 0;">
          <p style="margin: 0; color: #64748b;">
            <strong>What's next?</strong><br>
            You'll now receive email notifications based on your preferences. You can always change these settings in your account dashboard.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard" 
             style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Go to Dashboard
          </a>
        </div>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          Best regards,<br>
          The Documind Team<br>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/settings" style="color: #3B82F6;">Manage Preferences</a>
        </p>
      </div>
    `
  },

  analysisComplete: {
    subject: 'File Analysis Complete - Documind',
    getHtml: (userName, fileCount, fileNames) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3B82F6; margin: 0;">Documind</h1>
        </div>
        <h2 style="color: #10B981;">Analysis Complete! 🎉</h2>
        <p>Hi ${userName},</p>
        <p>Great news! Your analysis for <strong>${fileCount}</strong> file(s) has been completed and is ready for review.</p>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #10B981; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Files analyzed:</strong></p>
          <p style="font-size: 14px; color: #374151; margin: 0;">${fileNames}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard" 
             style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Results
          </a>
        </div>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          Best regards,<br>
          The Documind Team
        </p>
      </div>
    `
  },

  dailyReminder: {
    subject: "Don't forget your daily prompts - Documind",
    getHtml: (userName, remainingPrompts, totalPrompts, tier) => `
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
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/chat" 
             style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Start Analyzing Files
          </a>
        </div>

        <p style="font-size: 12px; color: #6b7280;">
          You can disable these reminders in your <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/settings" style="color: #3B82F6;">account settings</a>.
        </p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          Best regards,<br>
          The Documind Team
        </p>
      </div>
    `
  }
};

export default async function handler(req, res) {
  // Method check
  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Check environment variables
  if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
    console.error('❌ Missing Gmail credentials');
    return res.status(500).json({ 
      message: 'Email service not configured',
      details: 'Gmail credentials missing' 
    });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration');
    return res.status(500).json({ message: 'Database service not configured' });
  }

  try {
    const { userId, emailType, data = {} } = req.body;

    console.log('📝 Request Data:', { userId, emailType, data });

    if (!userId || !emailType) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ message: 'Missing required fields: userId and emailType are required' });
    }

    console.log(`🔍 Processing email request: ${emailType} for user: ${userId}`);

    // Get user data
    console.log('🔍 Fetching user from Supabase...');
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email, name, notification_settings')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Supabase user fetch error:', userError);
      return res.status(404).json({ message: 'User not found', error: userError.message });
    }

    if (!user) {
      console.log('❌ User not found in database');
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`✅ Found user: ${user.email}`);
    console.log('📋 User notification settings:', user.notification_settings);

    // Check if email notifications are enabled
    const notificationSettings = user.notification_settings || {};
    if (!notificationSettings.emailNotifications) {
      console.log('⚠️ Email notifications disabled for user');
      
      // Still log the skipped notification
      await supabaseAdmin
        .from('notification_log')
        .insert({
          user_id: userId,
          email_type: emailType,
          status: 'skipped',
          email_address: user.email,
          subject: emailTemplates[emailType]?.subject || 'Documind Notification'
        });

      return res.status(200).json({ message: 'Email notifications disabled for user' });
    }

    // Get email template
    const template = emailTemplates[emailType];
    if (!template) {
      console.error(`❌ Invalid email type: ${emailType}`);
      return res.status(400).json({ 
        message: 'Invalid email type', 
        availableTypes: Object.keys(emailTemplates) 
      });
    }

    console.log('📧 Generating email content...');

    // Generate email content
    let htmlContent;
    let subject = template.subject;

    switch (emailType) {
      case 'preferencesUpdated':
        htmlContent = template.getHtml(user.name || 'User');
        break;
      case 'analysisComplete':
        htmlContent = template.getHtml(
          user.name || 'User',
          data.fileCount || 1,
          data.fileNames || 'Your files'
        );
        break;
      case 'dailyReminder':
        htmlContent = template.getHtml(
          user.name || 'User',
          data.remainingPrompts || 0,
          data.totalPrompts || 10,
          data.tier || 'free'
        );
        break;
      default:
        console.error(`❌ Unsupported email type: ${emailType}`);
        return res.status(400).json({ message: 'Unsupported email type' });
    }

    console.log('📧 Email content generated, creating transporter...');

    // Create transporter and send email
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Documind" <${process.env.GMAIL_EMAIL}>`,
      to: user.email,
      subject: subject,
      html: htmlContent,
    };

    console.log('📤 Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      htmlLength: htmlContent.length
    });

    const result = await transporter.sendMail(mailOptions);

    console.log('✅ Nodemailer response:', result);

    if (!result.messageId) {
      throw new Error('Failed to send email - no message ID returned');
    }

    // Log successful notification
    console.log('📝 Logging successful notification...');
    const logResult = await supabaseAdmin
      .from('notification_log')
      .insert({
        user_id: userId,
        email_type: emailType,
        status: 'sent',
        email_address: user.email,
        subject: subject,
        sent_at: new Date().toISOString()
      });

    if (logResult.error) {
      console.error('⚠️ Failed to log notification:', logResult.error);
      // Don't fail the request if logging fails
    }

    console.log(`✅ Email sent successfully to ${user.email}: ${emailType}, Message ID: ${result.messageId}`);
    
    res.status(200).json({ 
      message: 'Email sent successfully',
      messageId: result.messageId,
      recipient: user.email
    });

  } catch (error) {
    console.error('❌ Email sending error:', error);
    console.error('❌ Error stack:', error.stack);

    // Log failed notification
    try {
      if (req.body.userId) {
        await supabaseAdmin
          .from('notification_log')
          .insert({
            user_id: req.body.userId,
            email_type: req.body.emailType || 'unknown',
            status: 'failed',
            error_message: error.message,
            sent_at: new Date().toISOString()
          });
      }
    } catch (logError) {
      console.error('❌ Failed to log notification error:', logError);
    }

    res.status(500).json({ 
      message: 'Failed to send email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        name: error.name
      } : undefined
    });
  }
}

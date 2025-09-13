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

    // Get all users with notification settings enabled
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, subscription_tier, notification_settings')
      .not('notification_settings', 'is', null);

    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }

    console.log(`Found ${users?.length || 0} total users`);

    // Filter users for IST reminders (since cron runs at 10:00 AM IST)
    const eligibleUsers = (users || []).filter(user => {
      const settings = user.notification_settings || {};
      return (
        settings.emailNotifications &&
        settings.promptReminders &&
        // For now, send to all users who have reminders enabled
        // Later you can add timezone-specific logic
        settings.reminderTime === '10:00' // Default IST time
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

    // Fetch usage data for eligible users
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

      // Send reminder if user has remaining prompts and hasn't used 80% of daily limit
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

          // Log successful notification
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

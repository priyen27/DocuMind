export const emailTemplates = {
  preferencesUpdated: {
    subject: 'Preferences Updated - FileMentor',
    getHtml: (userName) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Preferences Updated</h2>
        <p>Hi ${userName},</p>
        <p>Your FileMentor preferences have been successfully updated.</p>
        <p>You can always change your notification settings in your account preferences.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          Best regards,<br>
          The FileMentor Team
        </p>
      </div>
    `
  },

  analysisComplete: {
    subject: 'File Analysis Complete - FileMentor',
    getHtml: (userName, fileCount, fileNames) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Analysis Complete! 🎉</h2>
        <p>Hi ${userName},</p>
        <p>Your analysis for <strong>${fileCount}</strong> file(s) is ready!</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>Files analyzed:</strong></p>
          <p style="font-size: 14px; color: #6b7280;">${fileNames}</p>
        </div>
        <p>View your results in FileMentor dashboard.</p>
        <a href="https://your-app.vercel.app/dashboard" 
           style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0;">
          View Results
        </a>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          Best regards,<br>
          The FileMentor Team
        </p>
      </div>
    `
  },

  dailyReminder: {
    subject: "Don't forget your daily prompts - FileMentor",
    getHtml: (userName, remainingPrompts, totalPrompts, tier) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F59E0B;">Don't Miss Out! ⏰</h2>
        <p>Hi ${userName},</p>
        <p>You still have <strong>${remainingPrompts} out of ${totalPrompts}</strong> daily prompts unused today!</p>
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #F59E0B;">
          <p style="margin: 0;"><strong>Your ${tier} plan includes:</strong></p>
          <p style="margin: 5px 0 0 0; font-size: 14px;">• ${totalPrompts} prompts per day</p>
          <p style="margin: 5px 0 0 0; font-size: 14px;">• AI-powered file analysis</p>
          <p style="margin: 5px 0 0 0; font-size: 14px;">• Smart document insights</p>
        </div>
        <p>Make the most of your FileMentor experience!</p>
        <a href="https://your-app.vercel.app/chat" 
           style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0;">
          Start Analyzing Files
        </a>
        <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
          You can disable these reminders in your <a href="https://your-app.vercel.app/settings">account settings</a>.
        </p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          Best regards,<br>
          The FileMentor Team
        </p>
      </div>
    `
  }
};
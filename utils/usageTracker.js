// utils/usageTracker.js
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export class UsageTracker {
  constructor() {
    this.supabase = createClientComponentClient();
  }

  /**
   * Track a prompt usage
   * @param {string} userId - The user ID
   * @param {string} sessionId - The chat session ID (optional)
   */
  async trackPrompt(userId, sessionId = null) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Use the database function to increment usage
      const { data, error } = await this.supabase.rpc('increment_daily_usage', {
        p_user_id: userId,
        p_usage_date: today,
        p_field: 'prompts_used',
        p_increment: 1
      });

      if (error) {
        console.error('Error with increment_daily_usage function:', error);
        // Fallback to manual upsert if function fails
        await this.fallbackTrackPrompt(userId, today);
      }

      // Also update the legacy fields in users table
      const { error: userError } = await this.supabase.rpc('increment_user_usage', {
        p_user_id: userId,
        p_date: today
      });

      if (userError) {
        console.error('Error with increment_user_usage function:', userError);
        // Fallback to manual update
        await this.fallbackUpdateUser(userId, today);
      }

      console.log('Prompt usage tracked successfully for user:', userId);
      return true;

    } catch (error) {
      console.error('Error tracking prompt usage:', error);
      return false;
    }
  }

  // Fallback method if database function fails
  async fallbackTrackPrompt(userId, today) {
    try {
      // First get current usage
      const { data: currentData } = await this.supabase
        .from('daily_usage')
        .select('prompts_used')
        .eq('user_id', userId)
        .eq('usage_date', today)
        .maybeSingle();

      const currentUsage = currentData?.prompts_used || 0;

      const { error } = await this.supabase
        .from('daily_usage')
        .upsert({
          user_id: userId,
          usage_date: today,
          prompts_used: currentUsage + 1
        }, {
          onConflict: 'user_id,usage_date',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Fallback prompt tracking failed:', error);
      }
    } catch (error) {
      console.error('Error in fallback prompt tracking:', error);
    }
  }

  // Fallback method for user table update
  async fallbackUpdateUser(userId, today) {
    try {
      // Get current user data
      const { data: userData, error: fetchError } = await this.supabase
        .from('users')
        .select('daily_prompts_used, monthly_prompts_used, last_prompt_date')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching user data for fallback:', fetchError);
        return;
      }

      const lastPromptDate = userData?.last_prompt_date;
      const isToday = lastPromptDate === today;
      const isSameMonth = lastPromptDate && 
        new Date(lastPromptDate).getMonth() === new Date(today).getMonth() &&
        new Date(lastPromptDate).getFullYear() === new Date(today).getFullYear();

      const { error } = await this.supabase
        .from('users')
        .update({
          daily_prompts_used: isToday ? (userData?.daily_prompts_used || 0) + 1 : 1,
          monthly_prompts_used: isSameMonth ? (userData?.monthly_prompts_used || 0) + 1 : 1,
          last_prompt_date: today,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Fallback user update failed:', error);
      }
    } catch (error) {
      console.error('Error in fallback user update:', error);
    }
  }

  /**
   * Track a file upload
   * @param {string} userId - The user ID
   * @param {string} fileId - The uploaded file ID
   */
  async trackFileUpload(userId, fileId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await this.supabase.rpc('increment_daily_usage', {
        p_user_id: userId,
        p_usage_date: today,
        p_field: 'files_uploaded',
        p_increment: 1
      });

      if (error) {
        console.error('Error tracking file upload:', error);
        // Fallback
        const { data: currentData } = await this.supabase
          .from('daily_usage')
          .select('files_uploaded')
          .eq('user_id', userId)
          .eq('usage_date', today)
          .maybeSingle();

        const currentUploads = currentData?.files_uploaded || 0;

        await this.supabase
          .from('daily_usage')
          .upsert({
            user_id: userId,
            usage_date: today,
            files_uploaded: currentUploads + 1
          }, {
            onConflict: 'user_id,usage_date',
            ignoreDuplicates: false
          });
      }

      console.log('File upload tracked successfully');
      return true;

    } catch (error) {
      console.error('Error tracking file upload:', error);
      return false;
    }
  }

  /**
   * Track an AI analysis generation
   * @param {string} userId - The user ID
   * @param {string} fileId - The file ID that was analyzed
   * @param {string} analysisType - Type of analysis
   */
  async trackAnalysis(userId, fileId, analysisType) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await this.supabase.rpc('increment_daily_usage', {
        p_user_id: userId,
        p_usage_date: today,
        p_field: 'analysis_generated',
        p_increment: 1
      });

      if (error) {
        console.error('Error tracking analysis:', error);
      }

      console.log('Analysis tracked successfully');
      return true;

    } catch (error) {
      console.error('Error tracking analysis:', error);
      return false;
    }
  }

  /**
   * Get current user usage for today with better error handling
   * @param {string} userId - The user ID
   */
  async getCurrentUsage(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const monthStart = startOfMonth.toISOString().split('T')[0];
      
      // Get today's usage with retry logic
      let todayData = null;
      let todayError = null;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await this.supabase
          .from('daily_usage')
          .select('*')
          .eq('user_id', userId)
          .eq('usage_date', today)
          .maybeSingle();
        
        if (!error || error.code === 'PGRST116') {
          todayData = data;
          break;
        }
        
        todayError = error;
        console.warn(`Attempt ${attempt + 1} failed:`, error);
        
        // Wait a bit before retrying
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (todayError && todayError.code !== 'PGRST116') {
        console.error('Error fetching today usage after retries:', todayError);
      }

      // Get this month's total usage
      const { data: monthlyData, error: monthlyError } = await this.supabase
        .from('daily_usage')
        .select('prompts_used, files_uploaded, analysis_generated')
        .eq('user_id', userId)
        .gte('usage_date', monthStart);

      if (monthlyError) {
        console.error('Error fetching monthly usage:', monthlyError);
      }

      // Calculate monthly totals
      const monthlyTotals = monthlyData?.reduce((acc, day) => ({
        prompts: acc.prompts + (day.prompts_used || 0),
        files: acc.files + (day.files_uploaded || 0),
        analysis: acc.analysis + (day.analysis_generated || 0)
      }), { prompts: 0, files: 0, analysis: 0 }) || { prompts: 0, files: 0, analysis: 0 };

      const result = {
        dailyPromptsUsed: todayData?.prompts_used || 0,
        dailyFilesUploaded: todayData?.files_uploaded || 0,
        dailyAnalysisGenerated: todayData?.analysis_generated || 0,
        monthlyPromptsUsed: monthlyTotals.prompts,
        monthlyFilesUploaded: monthlyTotals.files,
        monthlyAnalysisGenerated: monthlyTotals.analysis
      };

      console.log('Current usage fetched:', result);
      return result;

    } catch (error) {
      console.error('Error fetching current usage:', error);
      return {
        dailyPromptsUsed: 0,
        dailyFilesUploaded: 0,
        dailyAnalysisGenerated: 0,
        monthlyPromptsUsed: 0,
        monthlyFilesUploaded: 0,
        monthlyAnalysisGenerated: 0
      };
    }
  }

  /**
   * Check if user has reached daily limit with tier consideration
   * @param {string} userId - The user ID
   * @param {string} subscriptionTier - User's subscription tier
   */
  async checkDailyLimit(userId, subscriptionTier = 'free') {
    try {
      const limits = {
        free: 10,
        pro: 25,
        legend: 50
      };

      const currentUsage = await this.getCurrentUsage(userId);
      const limit = limits[subscriptionTier] || limits.free;
      
      return {
        hasReachedLimit: currentUsage.dailyPromptsUsed >= limit,
        remainingPrompts: Math.max(0, limit - currentUsage.dailyPromptsUsed),
        currentUsage: currentUsage.dailyPromptsUsed,
        limit,
        tier: subscriptionTier
      };
    } catch (error) {
      console.error('Error checking daily limit:', error);
      return {
        hasReachedLimit: false,
        remainingPrompts: 10,
        currentUsage: 0,
        limit: 10,
        tier: 'free'
      };
    }
  }

  /**
   * Get usage statistics for last 30 days
   * @param {string} userId - The user ID
   */
  async getUsageStats(userId) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: dailyUsage, error } = await this.supabase
        .from('daily_usage')
        .select('*')
        .eq('user_id', userId)
        .gte('usage_date', startDate)
        .order('usage_date', { ascending: false });

      if (error) {
        console.error('Error fetching usage stats:', error);
        return this.getFallbackStats(userId);
      }

      if (!dailyUsage || dailyUsage.length === 0) {
        return this.getFallbackStats(userId);
      }

      const stats = dailyUsage.reduce((acc, day) => ({
        totalPrompts: acc.totalPrompts + (day.prompts_used || 0),
        totalFiles: acc.totalFiles + (day.files_uploaded || 0),
        totalAnalysis: acc.totalAnalysis + (day.analysis_generated || 0),
        activeDays: acc.activeDays + ((day.prompts_used > 0 || day.files_uploaded > 0) ? 1 : 0)
      }), {
        totalPrompts: 0,
        totalFiles: 0,
        totalAnalysis: 0,
        activeDays: 0
      });

      return stats;
    } catch (error) {
      console.error('Error in getUsageStats:', error);
      return this.getFallbackStats(userId);
    }
  }

  // Fallback stats method
  async getFallbackStats(userId) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const [filesResult, messagesResult, analyticsResult] = await Promise.all([
        this.supabase
          .from('files')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('upload_date', thirtyDaysAgo.toISOString()),
        this.supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('role', 'user')
          .gte('timestamp', thirtyDaysAgo.toISOString()),
        this.supabase
          .from('file_analytics')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('generated_at', thirtyDaysAgo.toISOString())
      ]);

      return {
        totalPrompts: messagesResult.count || 0,
        totalFiles: filesResult.count || 0,
        totalAnalysis: analyticsResult.count || 0,
        activeDays: 0 // Can't calculate without daily_usage data
      };
    } catch (error) {
      console.error('Error in fallback stats:', error);
      return {
        totalPrompts: 0,
        totalFiles: 0,
        totalAnalysis: 0,
        activeDays: 0
      };
    }
  }

  /**
   * Force refresh usage data from server
   * @param {string} userId - The user ID
   */
  async refreshUsage(userId) {
    try {
      console.log('Force refreshing usage data...');
      return await this.getCurrentUsage(userId);
    } catch (error) {
      console.error('Error refreshing usage:', error);
      return null;
    }
  }
}

// Export singleton instance
export const usageTracker = new UsageTracker();

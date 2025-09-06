import { useState, useEffect } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { 
  ArrowLeft,
  User,
  Bell,
  Shield,
  Trash2,
  Crown,
  Sparkles,
  Save,
  Eye,
  EyeOff,
  Download,
  Upload,
  Zap,
  Lock,
  Mail
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { usageTracker } from '../utils/usageTracker';

export default function Settings() {
  const user = useUser();
  const supabase = useSupabaseClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [lastTestEmail, setLastTestEmail] = useState(null);
  
  // Profile settings
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    avatar_url: ''
  });
  
  // Preferences
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    promptReminders: false,
    reminderTime: '10:00'
  });

  // Usage stats
  const [usageStats, setUsageStats] = useState(null);
  const [currentUsage, setCurrentUsage] = useState({
    dailyPromptsUsed: 0,
    monthlyPromptsUsed: 0,
    todayFilesUploaded: 0,
    monthlyFilesUploaded: 0
  });

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchUsageData();
    }
  }, [user]);

  useEffect(() => {
    loadUserPreferences();
    loadNotificationHistory();
  }, [user]);

  const loadUserPreferences = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('notification_settings')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading preferences:', error);
        return;
      }

      if (data?.notification_settings) {
        setPreferences(prev => ({
          ...prev,
          ...data.notification_settings
        }));
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const loadNotificationHistory = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notification_log')
        .select('id, email_type, status, sent_at')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading notification history:', error);
        return;
      }

      setNotificationHistory(data || []);
    } catch (error) {
      console.error('Error loading notification history:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      setUserProfile(data);
      setProfile({
        name: data.name || '',
        email: data.email || user.email,
        avatar_url: data.avatar_url || ''
      });
      
      if (data.preferences) {
        setPreferences(prev => ({ ...prev, ...data.preferences }));
      }
      
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Failed to load profile');
    }
  };

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      
      // Use the usage tracker to get current usage
      const currentUsageData = await usageTracker.getCurrentUsage(user.id);
      
      setCurrentUsage({
        dailyPromptsUsed: currentUsageData.dailyPromptsUsed,
        monthlyPromptsUsed: currentUsageData.monthlyPromptsUsed,
        todayFilesUploaded: currentUsageData.dailyFilesUploaded,
        monthlyFilesUploaded: currentUsageData.monthlyFilesUploaded
      });

      // Get 30-day usage stats
      const stats = await usageTracker.getUsageStats(user.id);
      setUsageStats(stats);
      
    } catch (error) {
      console.error('Error fetching usage data:', error);
      // Set fallback values
      setCurrentUsage({
        dailyPromptsUsed: 0,
        monthlyPromptsUsed: 0,
        todayFilesUploaded: 0,
        monthlyFilesUploaded: 0
      });
      setUsageStats({
        totalPrompts: 0,
        totalFiles: 0,
        totalAnalysis: 0,
        activeDays: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: profile.name,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success('Profile updated successfully');
      fetchUserProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user?.id) {
      toast.error('User not found');
      return;
    }

    setLoading(true);
    try {
      // Validate reminder time if reminders are enabled
      if (preferences.promptReminders && !preferences.reminderTime) {
        toast.error('Please select a reminder time');
        setLoading(false);
        return;
      }

      let reminderTimeUTC = preferences.reminderTime;

      if (preferences.promptReminders && preferences.reminderTime) {
        // Convert IST (Asia/Kolkata) to UTC before saving
        const [hours, minutes] = preferences.reminderTime.split(':');
        const istDate = new Date();
        istDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
        // Convert to UTC string HH:MM
        const utcHours = istDate.getUTCHours().toString().padStart(2, '0');
        const utcMinutes = istDate.getUTCMinutes().toString().padStart(2, '0');
        reminderTimeUTC = `${utcHours}:${utcMinutes}`;
      }

      const { error } = await supabase
        .from('users')
        .update({
          notification_settings: {
            emailNotifications: preferences.emailNotifications,
            promptReminders: preferences.promptReminders,
            reminderTime: reminderTimeUTC  || '10:00'
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (error) throw error;

      // Send confirmation email if email notifications are enabled
      if (preferences.emailNotifications) {
        try {
          const response = await fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              emailType: 'preferencesUpdated'
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to send confirmation email:', errorData);
            // Don't fail the save operation, just log the error
          } else {
            console.log('Confirmation email sent successfully');
          }
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError);
          // Don't fail the save operation if email fails
        }
      }
      
      toast.success('Preferences saved successfully');
      
      // Reload notification history to show the confirmation email
      setTimeout(() => {
        loadNotificationHistory();
      }, 2000);
      
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!user?.id) {
      toast.error('User not found');
      return;
    }

    if (lastTestEmail && (Date.now() - lastTestEmail < 600000)) {
      toast.error('Please wait 10 minutes before sending another test email');
      return;
    }
    setLastTestEmail(Date.now());
    setTestEmailLoading(true);
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          emailType: 'preferencesUpdated'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send test email');
      }

      toast.success('Test email sent successfully! Check your inbox.');
      
      // Reload notification history
      setTimeout(() => {
        loadNotificationHistory();
      }, 1000);
      
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Failed to send test email');
    } finally {
      setTestEmailLoading(false);
    }
  };

  const formatNotificationType = (type) => {
    const typeMap = {
      'preferencesUpdated': 'Preferences Updated',
      'analysisComplete': 'Analysis Complete',
      'dailyReminder': 'Daily Reminder',
      'test': 'Test Email'
    };
    
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };


  const exportData = async () => {
    // Check if user has Legend plan
    if (userProfile.subscription_tier !== 'legend') {
      toast.error('Data export is only available for Legend users. Upgrade your plan to access this feature.');
      return;
    }

    setLoading(true);
    try {
      // Show progress to user
      toast.loading('Preparing your data for export...', { id: 'export-progress' });

      const [filesResult, sessionsResult, messagesResult, analyticsResult, usageResult] = await Promise.all([
        supabase.from('files').select('*').eq('user_id', user.id),
        supabase.from('chat_sessions').select('*').eq('user_id', user.id),
        supabase.from('messages').select('*').eq('user_id', user.id),
        supabase.from('file_analytics').select('*').eq('user_id', user.id),
        supabase.from('daily_usage').select('*').eq('user_id', user.id)
      ]);

      // Prepare comprehensive export data with metadata
      const exportData = {
        exportInfo: {
          userId: user.id,
          userEmail: user.email,
          plan: userProfile.subscription_tier,
          exportDate: new Date().toISOString(),
          dataVersion: '2.0'
        },
        profile: {
          name: userProfile.name,
          email: userProfile.email,
          subscription_tier: userProfile.subscription_tier,
          created_at: userProfile.created_at,
          preferences: userProfile.preferences
        },
        files: {
          count: filesResult.data?.length || 0,
          data: filesResult.data || []
        },
        chatSessions: {
          count: sessionsResult.data?.length || 0,
          data: sessionsResult.data || []
        },
        messages: {
          count: messagesResult.data?.length || 0,
          data: messagesResult.data || []
        },
        analytics: {
          count: analyticsResult.data?.length || 0,
          data: analyticsResult.data || []
        },
        usageHistory: {
          count: usageResult.data?.length || 0,
          data: usageResult.data || []
        },
        currentUsageStats: usageStats,
        summary: {
          totalFiles: filesResult.data?.length || 0,
          totalSessions: sessionsResult.data?.length || 0,
          totalMessages: messagesResult.data?.length || 0,
          accountAge: userProfile.created_at ? 
            Math.floor((new Date() - new Date(userProfile.created_at)) / (1000 * 60 * 60 * 24)) : 0
        }
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documind-export-${user.id}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.dismiss('export-progress');
      toast.success(`Data exported successfully! ${exportData.summary.totalFiles} files, ${exportData.summary.totalMessages} messages included.`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.dismiss('export-progress');
      toast.error('Failed to export data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    const confirmation = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmation !== 'DELETE') {
      toast.error('Account deletion cancelled');
      return;
    }

    setLoading(true);
    try {
      // Delete user data in correct order (foreign key constraints)
      await Promise.all([
        supabase.from('messages').delete().eq('user_id', user.id),
        supabase.from('chat_sessions').delete().eq('user_id', user.id),
        supabase.from('file_analytics').delete().eq('user_id', user.id),
        supabase.from('daily_usage').delete().eq('user_id', user.id),
        supabase.from('files').delete().eq('user_id', user.id)
      ]);
      
      await supabase.from('users').delete().eq('id', user.id);
      await supabase.auth.signOut();
      
      toast.success('Account deleted successfully');
      router.push('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  // Refresh usage data function
  const refreshUsage = async () => {
    await fetchUsageData();
    toast.success('Usage data refreshed');
  };

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getPlanDisplay = (plan) => {
    const plans = {
      free: { name: 'Free Plan', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-700', limit: 10, price: '$0/mo' },
      pro: { name: 'Pro Plan', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-700', limit: 25, price: '$9/mo' },
      legend: { name: 'Legend', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-700', limit: 50, price: '$15/mo' }
    };
    return plans[plan] || plans.free;
  };

  const planInfo = getPlanDisplay(userProfile.subscription_tier);

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'preferences', name: 'Preferences', icon: Bell },
    { id: 'usage', name: 'Usage & Billing', icon: Zap },
    { id: 'privacy', name: 'Privacy & Security', icon: Shield },
    { id: 'data', name: 'Data Management', icon: Download }
  ];

  const formatReminderTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back to Dashboard</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <User size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{profile.name || 'User'}</p>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${planInfo.bgColor} ${planInfo.textColor} text-xs font-medium`}>
                    {userProfile.subscription_tier === 'legend' ? <Crown className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                    {planInfo.name}
                  </div>
                </div>
              </div>

              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={18} />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                      <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Avatar URL
                      </label>
                      <input
                        type="url"
                        value={profile.avatar_url}
                        onChange={(e) => setProfile(prev => ({ ...prev, avatar_url: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://example.com/avatar.jpg"
                      />
                    </div>

                    <button
                      onClick={saveProfile}
                      disabled={loading}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      <Save size={18} />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Preferences</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Email Notifications</h3>
                      <div className="space-y-4">
                        <label className="flex items-center justify-between">
                          <div>
                            <span className="text-gray-900">Email Notifications</span>
                            <p className="text-sm text-gray-500">Receive updates about your account and file analysis</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={preferences.emailNotifications}
                            onChange={(e) => setPreferences(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </label>

                        <label className="flex items-center justify-between">
                          <div>
                            <span className="text-gray-900">Daily Prompt Reminders</span>
                            <p className="text-sm text-gray-500">Get reminded if you haven&apos;t used your daily prompts</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={preferences.promptReminders}
                            onChange={(e) => setPreferences(prev => ({ ...prev, promptReminders: e.target.checked }))}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </label>

                        {preferences.promptReminders && (
                          <div className="ml-6 mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <label className="block">
                              <span className="text-sm font-medium text-gray-900">Reminder Time</span>
                              <p className="text-xs text-gray-500 mb-2">
                                Choose when you&apos;d like to receive daily reminders (your local time)
                              </p>
                              <select
                                value={preferences.reminderTime}
                                onChange={(e) => setPreferences(prev => ({ ...prev, reminderTime: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              >
                                <option value="08:00">8:00 AM</option>
                                <option value="09:00">9:00 AM</option>
                                <option value="10:00">10:00 AM (Recommended)</option>
                                <option value="11:00">11:00 AM</option>
                                <option value="12:00">12:00 PM</option>
                                <option value="14:00">2:00 PM</option>
                                <option value="15:00">3:00 PM</option>
                                <option value="16:00">4:00 PM</option>
                                <option value="18:00">6:00 PM</option>
                              </select>
                              <p className="text-xs text-gray-500 mt-1">
                                Current setting: {formatReminderTime(preferences.reminderTime)}
                              </p>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
{/* 
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Interface</h3>
                      <div className="space-y-4">
                        <label className="flex items-center justify-between">
                          <div>
                            <span className="text-gray-900">Dark Mode</span>
                            <p className="text-sm text-gray-500">Switch to dark theme (coming soon)</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={preferences.darkMode}
                            onChange={(e) => setPreferences(prev => ({ ...prev, darkMode: e.target.checked }))}
                            disabled
                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 opacity-50"
                          />
                        </label>
                      </div>
                    </div> */}

                    <div className="flex items-center gap-4">
                      <button
                        onClick={savePreferences}
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Preferences'}
                      </button>

                      {preferences.emailNotifications && (
                        <button
                          onClick={sendTestEmail}
                          disabled={loading || testEmailLoading}
                          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          <Mail size={18} />
                          {testEmailLoading ? 'Sending...' : 'Send Test Email'}
                        </button>
                      )}
                    </div>

                    {/* Notification History */}
                    <div className="mt-8">
                      <h3 className="font-semibold text-gray-900 mb-4">Recent Notifications</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        {notificationHistory.length > 0 ? (
                          <div className="space-y-2">
                            {notificationHistory.slice(0, 5).map((notification) => (
                              <div key={notification.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    notification.status === 'sent' ? 'bg-green-500' : 
                                    notification.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                                  }`}></div>
                                  <span className="text-gray-900">{formatNotificationType(notification.email_type)}</span>
                                </div>
                                <span className="text-gray-500">
                                  {new Date(notification.sent_at).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No notifications sent yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'usage' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Usage & Billing</h2>
                    <button
                      onClick={refreshUsage}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Zap size={16} />
                      {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Current Plan */}
                    <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${planInfo.bgColor}`}>
                            {userProfile.subscription_tier === 'legend' ? (
                              <Crown className={`w-5 h-5 ${planInfo.textColor}`} />
                            ) : (
                              <Sparkles className={`w-5 h-5 ${planInfo.textColor}`} />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{planInfo.name}</h3>
                            <p className="text-sm text-gray-600">{planInfo.price}</p>
                          </div>
                        </div>
                        {/* <button
                          onClick={() => router.push('/pricing')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {userProfile.subscription_tier === 'legend' ? 'Manage Plan' : 'Upgrade'}
                        </button> */}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-sm text-gray-600">Daily Prompts</p>
                          <p className="font-semibold">{currentUsage.dailyPromptsUsed} / {planInfo.limit}</p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min((currentUsage.dailyPromptsUsed / planInfo.limit) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-sm text-gray-600">Monthly Usage</p>
                          <p className="font-semibold">{currentUsage.monthlyPromptsUsed}</p>
                          <p className="text-xs text-gray-500 mt-1">Files: {currentUsage.monthlyFilesUploaded}</p>
                        </div>
                      </div>
                    </div>

                    {/* Usage Stats */}
                    {usageStats && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Last 30 Days</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Total Prompts</p>
                            <p className="text-2xl font-bold text-gray-900">{usageStats.totalPrompts}</p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Files Uploaded</p>
                            <p className="text-2xl font-bold text-gray-900">{usageStats.totalFiles}</p>
                          </div>
                          {/* {(userProfile.subscription_tier === 'pro' || userProfile.subscription_tier === 'legend') && (
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600">AI Analysis</p>
                              <p className="text-2xl font-bold text-gray-900">{usageStats.totalAnalysis}</p>
                            </div>
                          )} */}

                           {/* Show upgrade prompt for free users */}
                            {/* {userProfile.subscription_tier === 'free' && (
                              <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                                <p className="text-sm text-purple-600 font-medium">AI Analysis</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Crown className="w-4 h-4 text-purple-500" />
                                  <span className="text-sm text-purple-700">Pro Feature</span>
                                </div>
                                <button 
                                  onClick={() => router.push('/pricing')}
                                  className="text-xs text-purple-600 hover:text-purple-800 underline mt-1"
                                >
                                  Upgrade to unlock
                                </button>
                              </div>
                            )} */}
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Active Days</p>
                            <p className="text-2xl font-bold text-gray-900">{usageStats.activeDays}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Privacy & Security</h2>
                  
                  <div className="space-y-6">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-green-900">Your data is secure</h3>
                          <p className="text-sm text-green-700 mt-1">
                            We use enterprise-grade encryption and security measures to protect your information.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900">Security Settings</h3>
                      
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Account Security</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Your account is secured with OAuth authentication through Google.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <Shield className="w-4 h-4" />
                          <span>Secured with Google OAuth</span>
                        </div>
                      </div>

                      <div className="p-4 border border-gray-200 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Data Encryption</h4>
                        <p className="text-sm text-gray-600">
                          All your documents and conversations are encrypted both in transit and at rest.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'data' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Management</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Export Data</h3>
                      
                      {/* userProfile.subscription_tier === 'legend' */}
                      {true ? (
                        <div>
                          <p className="text-gray-600 mb-4">
                            Download a comprehensive copy of all your data including files, conversations, analytics, and settings.
                          </p>
                          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg mb-4">
                            <div className="flex items-start gap-3">
                              <Crown className="w-5 h-5 text-purple-600 mt-0.5" />
                              <div>
                                <h4 className="font-medium text-purple-900">Export Features</h4>
                                <ul className="text-sm text-purple-700 mt-1 list-disc list-inside space-y-1">
                                  <li>Complete chat history with timestamps</li>
                                  <li>All uploaded files metadata</li>
                                  <li>Usage analytics and statistics</li>
                                  <li>Account preferences and settings</li>
                                  <li>Structured JSON format for easy import</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={exportData}
                            disabled={loading}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                          >
                            <Download size={18} />
                            {loading ? 'Preparing Export...' : 'Export My Data'}
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Lock className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-gray-900">Export Not Available</h4>
                              <p className="text-sm text-gray-600 mt-1 mb-3">
                                Data export is only available for Legend users. Upgrade your plan to access this premium feature.
                              </p>
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={() => router.push('/pricing')}
                                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                  <Crown size={16} />
                                  Upgrade to Legend
                                </button>
                                <div className="text-sm text-gray-500">
                                  Only <span className="font-semibold text-purple-600">$15/month</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="font-semibold text-red-600 mb-4">Danger Zone</h3>
                      <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                        <h4 className="font-medium text-red-900 mb-2">Delete Account</h4>
                        <p className="text-sm text-red-700 mb-4">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <button
                          onClick={deleteAccount}
                          disabled={loading}
                          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={18} />
                          {loading ? 'Deleting...' : 'Delete Account'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
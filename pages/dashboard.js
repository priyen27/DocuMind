import { useState, useEffect } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import ChatInterface from '../components/ChatInterface';
import Sidebar from '../components/Sidebar';
import FileAnalytics from '../components/FileAnalytics';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { Toaster, toast } from 'react-hot-toast';
import { BarChart3, MessageSquare, Sparkles, Crown, Menu } from 'lucide-react';

export default function Dashboard() {
  const user = useUser();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const [currentFileData, setCurrentFileData] = useState(null);
  const [isNewChat, setIsNewChat] = useState(false);
  
  const [currentView, setCurrentView] = useState('chat');
  const [showFileAnalytics, setShowFileAnalytics] = useState(false);
  const [userPlan, setUserPlan] = useState('free');
  const [userProfile, setUserProfile] = useState(null);
  const [dailyPromptsUsed, setDailyPromptsUsed] = useState(0);

  useEffect(() => {
    if (!user) {
      router.push('/');
    } else {
      fetchUserData();
    }
  }, [user, router]);

  const fetchUserData = async () => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      console.log('>>> userData', userData);
      
      if (error) throw error;
      
      setUserProfile(userData);
      setUserPlan(userData?.subscription_tier || 'free');
      
      const today = new Date().toDateString();
      const lastPromptDate = userData?.last_prompt_date ? new Date(userData.last_prompt_date).toDateString() : null;
      
      if (lastPromptDate === today) {
        setDailyPromptsUsed(userData?.daily_prompts_used || 0);
      } else {
        setDailyPromptsUsed(0);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {    
    const fetchFileData = async () => {
      if (activeFile) {
        try {
          const { data: file, error } = await supabase
            .from('files')
            .select('*')
            .eq('id', activeFile)
            .single();
          
          if (error) throw error;
          setCurrentFileData(file);
        } catch (error) {
          console.error('Dashboard - Error fetching file data:', error);
          setCurrentFileData(null);
        }
      } else {
        setCurrentFileData(null);
      }
    };

    fetchFileData();
  }, [activeFile, supabase]);

  const handleSelectSession = (sessionId, fileId) => {
    setActiveSession(sessionId);
    setActiveFile(fileId);
    setSidebarOpen(false);
    setCurrentView('chat');
    // Close analytics on mobile when selecting session
    if (window.innerWidth < 1024) {
      setShowFileAnalytics(false);
    }
  };

  const handleNewChat = () => {
    setActiveSession(null);
    setActiveFile(null);
    setCurrentFileData(null);
    setSidebarOpen(false);
    setCurrentView('chat');
    setShowFileAnalytics(false);
    setIsNewChat(true);
    
    setTimeout(() => {
      setIsNewChat(false);
    }, 100);
  };

  const handleFileUpload = async (fileRecord, sessionRecord) => {
    setActiveFile(fileRecord.id);
    setActiveSession(sessionRecord.id);
    setCurrentFileData(fileRecord);
    setCurrentView('chat');
  };

  const getFileTypeDisplay = (mimeType) => {
    if (mimeType?.includes('pdf')) return 'PDF';
    if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return 'Excel';
    if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return 'PowerPoint';
    if (mimeType?.includes('word')) return 'Word';
    if (mimeType?.startsWith('image/')) return 'Image';
    return 'Document';
  };

  const getPlanDisplay = (plan) => {
    const plans = {
      free: { name: 'Free', color: 'gray', limit: 10, price: '$0' },
      pro: { name: 'Pro', color: 'blue', limit: 25, price: '$9' },
      legend: { name: 'Legend', color: 'purple', limit: 50, price: '$15' }
    };
    return plans[plan] || plans.free;
  };

  const getPlanIcon = (plan) => {
    if (plan === 'legend') return Crown;
    if (plan === 'pro') return Sparkles;
    return null;
  };

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const planInfo = getPlanDisplay(userPlan);
  const PlanIcon = getPlanIcon(userPlan);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster 
        position="top-right"
        toastOptions={{
          // Mobile-optimized toast positioning
          className: 'text-sm',
          style: {
            marginTop: '60px', // Account for fixed header
          }
        }}
      />
      
      <div className="flex h-screen">
        {/* Sidebar - Mobile optimized */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          activeSession={activeSession}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          user={user}
          userPlan={userPlan}
          dailyPromptsUsed={dailyPromptsUsed}
          onUpgradeClick={() => router.push('/pricing')}
        />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Fixed Header - Mobile optimized */}
          <header className="bg-white border-b border-gray-200 px-2 sm:px-4 py-2 sm:py-3 sticky top-0 z-30">
            <div className="flex items-center justify-between">
              {/* Left Side */}
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                  aria-label="Open menu"
                >
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </button>
                
                <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">DocuMind</h1>
                  </div>
                </div>
              </div>

              {/* Center - View Switcher - Mobile optimized */}
              <div className="flex bg-gray-100 rounded-lg sm:rounded-xl p-0.5 sm:p-1 mx-2">
                <button
                  onClick={() => {
                    setCurrentView('chat');
                    // Close analytics when switching to chat on mobile
                    if (window.innerWidth < 1024) {
                      setShowFileAnalytics(false);
                    }
                  }}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg flex items-center gap-1 sm:gap-2 transition-all duration-200 text-xs sm:text-sm font-medium ${
                    currentView === 'chat' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <MessageSquare size={12} className="sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden xs:inline">Chat</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentView('analytics');
                    // Close file analytics when switching to main analytics
                    setShowFileAnalytics(false);
                  }}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg flex items-center gap-1 sm:gap-2 transition-all duration-200 text-xs sm:text-sm font-medium ${
                    currentView === 'analytics' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <BarChart3 size={12} className="sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden xs:inline">Analytics</span>
                </button>
              </div>
              
              {/* Right Side - AI Analysis Button - Mobile optimized */}
              <div className="flex items-center gap-1 sm:gap-3">
                {/* AI Analysis Button - Only for Pro/Legend users */}
                {currentFileData && currentView === 'chat' && (userPlan === 'pro' || userPlan === 'legend') && (
                  <button
                    onClick={() => setShowFileAnalytics(!showFileAnalytics)}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
                      showFileAnalytics 
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                        : 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 hover:from-purple-200 hover:to-blue-200 hover:shadow-md'
                    }`}
                  >
                    <Sparkles size={12} className="sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden xs:inline">Analysis</span>
                  </button>
                )}
              </div>
            </div>
          </header>
          
          {/* Main Content Area */}
          <main className="flex-1 overflow-hidden">
            {currentView === 'chat' ? (
              <div className="flex h-full">
                {/* Chat Interface - Hide on mobile when analytics is open */}
                <div className={`flex-1 ${showFileAnalytics ? 'hidden lg:block' : 'block'}`}>
                  <ChatInterface 
                    sessionId={activeSession} 
                    fileId={activeFile}
                    currentFile={currentFileData}
                    onFileUpload={handleFileUpload}
                    isNewChat={isNewChat || (!activeSession && !activeFile)}
                  />
                </div>
                
                {/* AI Analysis Sidebar - Full screen on mobile */}
                {showFileAnalytics && (userPlan === 'pro' || userPlan === 'legend') && (
                  <div className={`
                    ${showFileAnalytics ? 'flex' : 'hidden'}
                    w-full lg:w-96 
                    bg-white overflow-hidden flex-col 
                    lg:border-l border-gray-200
                    absolute lg:relative
                    inset-0 lg:inset-auto
                    z-20 lg:z-auto
                  `}>
                    {/* Header */}
                    <div className="p-3 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                          </div>
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">AI Analysis</h3>
                        </div>
                        <button
                          onClick={() => setShowFileAnalytics(false)}
                          className="p-1 sm:p-1.5 hover:bg-white/80 rounded-lg transition-colors"
                          aria-label="Close analysis"
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      {currentFileData && (
                        <div className="p-2 sm:p-3 bg-white rounded-xl border shadow-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                            <p className="font-medium text-xs sm:text-sm text-gray-900 truncate">
                              {currentFileData.original_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span>{getFileTypeDisplay(currentFileData.file_type)}</span>
                            <span>•</span>
                            <span>{(currentFileData.file_size / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Analysis Content */}
                    <div className="flex-1 overflow-y-auto">
                      {currentFileData ? (
                        <FileAnalytics 
                          fileId={currentFileData.id}
                          userPlan={userPlan}
                          onAnalysisGenerated={(type, analysis) => {
                            console.log('Analysis generated:', type, analysis);
                          }}
                          onUpgradeClick={() => router.push('/pricing')}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 py-8 px-4">
                          <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mb-3" />
                          <p className="font-medium text-sm sm:text-base">No file selected</p>
                          <p className="text-xs sm:text-sm">Upload a document to generate AI analysis</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Analytics Dashboard View - Mobile optimized */
              <div className="p-3 sm:p-6 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                  <div className="mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
                    <p className="text-sm sm:text-base text-gray-600">Track your document insights and usage</p>
                  </div>
                  <AnalyticsDashboard userId={user.id} />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

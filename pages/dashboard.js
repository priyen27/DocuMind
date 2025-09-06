// Fixed Dashboard.js - Replace the header section and related parts

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
  const [userPlan, setUserPlan] = useState('free'); // free, pro, legend
  const [userProfile, setUserProfile] = useState(null); // Add this state
  const [dailyPromptsUsed, setDailyPromptsUsed] = useState(0);

  useEffect(() => {
    if (!user) {
      router.push('/');
    } else {
      // Fetch user subscription tier and profile
      fetchUserData();
    }
  }, [user, router]);

  const fetchUserData = async () => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*') // Select all user data
        .eq('id', user.id)
        .single();
      
      console.log('>>> userData', userData);
      
      if (error) throw error;
      
      // Set both userProfile and userPlan
      setUserProfile(userData);
      setUserPlan(userData?.subscription_tier || 'free');
      
      // Reset daily prompts if it's a new day
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

  // Fetch file data when activeFile changes
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
  };

  const handleNewChat = () => {
  setActiveSession(null);
  setActiveFile(null);
  setCurrentFileData(null);
  setSidebarOpen(false);
  setCurrentView('chat');
  // Force re-render by setting a flag if needed
  setIsNewChat(true);
  
  // Reset the new chat flag after a brief moment to allow UI to update
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
      <Toaster position="top-right" />
      
      <div className="flex h-screen">
        {/* Sidebar */}
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
          {/* Fixed Header */}
          <header className="bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left Side */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Menu className="w-5 h-5 text-gray-600" />
                </button>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">DocuMind</h1>
                  </div>
                  
                  {/* Current Plan Badge with Usage */}
                  {/* <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${planInfo.color}-100 text-${planInfo.color}-700`}>
                    {PlanIcon && <PlanIcon className="w-3 h-3" />}
                    {planInfo.name}
                    <span className="text-xs opacity-75">
                      ({dailyPromptsUsed}/{planInfo.limit})
                    </span>
                  </div> */}
                </div>
              </div>

              {/* Center - View Switcher */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setCurrentView('chat')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${
                    currentView === 'chat' 
                      ? 'bg-white text-blue-600 shadow-sm font-medium' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <MessageSquare size={16} />
                  Chat
                </button>
                <button
                  onClick={() => setCurrentView('analytics')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${
                    currentView === 'analytics' 
                      ? 'bg-white text-blue-600 shadow-sm font-medium' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <BarChart3 size={16} />
                  Analytics
                </button>
              </div>
              
              {/* Right Side - AI Analysis Button */}
              <div className="flex items-center gap-3">
                {/* AI Analysis Button - Only for Pro/Legend users */}
                {currentFileData && currentView === 'chat' && (userPlan === 'pro' || userPlan === 'legend') && (
                  <button
                    onClick={() => setShowFileAnalytics(!showFileAnalytics)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      showFileAnalytics 
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg transform scale-105' 
                        : 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 hover:from-purple-200 hover:to-blue-200 hover:shadow-md'
                    }`}
                  >
                    <Sparkles size={16} />
                    AI Analysis
                  </button>
                )}

                {/* Upgrade prompt for free users when file is selected */}
                {/* {currentFileData && currentView === 'chat' && userPlan === 'free' && (
                  <button
                    onClick={() => router.push('/pricing')}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 text-sm font-medium rounded-xl hover:from-amber-200 hover:to-orange-200 transition-all duration-200 border border-amber-200"
                  >
                    <Crown size={16} />
                    Unlock AI Analysis
                  </button>
                )} */}
                
                {/* General upgrade button */}
                {/* {(userPlan === 'free' || userPlan === 'pro') && (
                  <button
                    onClick={() => router.push('/pricing')}
                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-xl hover:shadow-lg transition-all duration-200"
                  >
                    <Crown size={14} />
                    {userPlan === 'free' ? 'Upgrade' : 'Go Legend'}
                  </button>
                )} */}
              </div>
            </div>
          </header>
          
          {/* Main Content Area */}
          <main className="flex-1 overflow-hidden">
            {currentView === 'chat' ? (
              <div className="flex h-full">
                {/* Chat Interface */}
                <div className="flex-1">
                  <ChatInterface 
                    sessionId={activeSession} 
                    fileId={activeFile}
                    currentFile={currentFileData}
                    onFileUpload={handleFileUpload}
                    isNewChat={isNewChat || (!activeSession && !activeFile)}
                  />
                </div>
                
                {/* AI Analysis Sidebar - Only show if user has access */}
                {showFileAnalytics && (userPlan === 'pro' || userPlan === 'legend') && (
                  <div className="w-96 border-l border-gray-200 bg-white overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                          <h3 className="font-semibold text-gray-900">AI Analysis</h3>
                        </div>
                        <button
                          onClick={() => setShowFileAnalytics(false)}
                          className="p-1.5 hover:bg-white/80 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      {currentFileData && (
                        <div className="p-3 bg-white rounded-xl border shadow-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <p className="font-medium text-sm text-gray-900 truncate">
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
                          <Sparkles className="w-12 h-12 text-gray-300 mb-3" />
                          <p className="font-medium">No file selected</p>
                          <p className="text-sm">Upload a document to generate AI analysis</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Analytics Dashboard View */
              <div className="p-6 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
                    <p className="text-gray-600">Track your document insights and usage</p>
                  </div>
                  <AnalyticsDashboard userId={user.id} />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
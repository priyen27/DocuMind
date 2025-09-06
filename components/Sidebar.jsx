import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { 
  FileText, 
  MessageCircle, 
  Plus, 
  Trash2, 
  User, 
  Settings, 
  LogOut, 
  Crown,
  ChevronDown,
  Sparkles,
  Folder,
  X,
  Files
} from 'lucide-react';

export default function Sidebar({ 
  isOpen, 
  onClose, 
  activeSession, 
  onSelectSession, 
  onNewChat, 
  user, 
  userPlan, 
  dailyPromptsUsed,
  onUpgradeClick 
}) {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [chatSessions, setChatSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChatSessions();
      fetchCollections();
    }
  }, [user]);

  // Real-time listeners for session and message updates
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('Setting up real-time listeners for user:', user.id);
    
    // Listen for new chat sessions
    const sessionChannel = supabase
      .channel('chat_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_sessions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New session created:', payload);
          fetchChatSessions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_sessions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Session updated:', payload);
          fetchChatSessions();
        }
      )
      .subscribe();

    // Listen for new messages to update message counts
    const messageChannel = supabase
      .channel('messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('New message added:', payload);
          // Refresh sessions to update message counts
          fetchChatSessions();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time listeners');
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(messageChannel);
    };
  }, [user?.id, supabase]);

  const fetchChatSessions = async () => {
    setLoading(true);
    try {
      // Updated query to handle both single file sessions and multiple file sessions
      const { data, error } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          file_id,
          session_name,
          created_at,
          updated_at,
          files (
            id,
            filename, 
            original_name, 
            file_type
          ),
          messages (id),
          session_files (
            files (
              id,
              original_name,
              file_type
            )
          )
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Process sessions to handle both old single-file and new multi-file sessions
      const processedSessions = data?.map(session => {
        // For sessions with multiple files (using session_files)
        if (session.session_files && session.session_files.length > 0) {
          const sessionFiles = session.session_files.map(sf => sf.files);
          return {
            ...session,
            attachedFiles: sessionFiles,
            fileCount: sessionFiles.length,
            displayName: session.session_name || (
              sessionFiles.length === 1 
                ? sessionFiles[0].original_name 
                : `${sessionFiles.length} files`
            )
          };
        }
        // For legacy sessions with single file (using file_id)
        else if (session.files) {
          return {
            ...session,
            attachedFiles: [session.files],
            fileCount: 1,
            displayName: session.session_name || session.files.original_name
          };
        }
        // For sessions without files
        else {
          return {
            ...session,
            attachedFiles: [],
            fileCount: 0,
            displayName: session.session_name || 'Untitled Chat'
          };
        }
      }) || [];
      
      setChatSessions(processedSessions);
      console.log('Fetched chat sessions:', processedSessions);
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      
      if (activeSession === sessionId) {
        onSelectSession(null, null);
      }
      
      fetchChatSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const handleSessionClick = (session) => {
    if (session.id) {
      // For multiple file sessions, pass null as fileId since we'll fetch files in ChatInterface
      // For single file sessions, pass the file_id for backward compatibility
      const fileId = session.fileCount === 1 ? 
        (session.file_id || session.attachedFiles[0]?.id) : 
        null;
      
      onSelectSession(session.id, fileId);
    } else {
      console.error('Missing session ID:', session);
    }
  };

  const fetchCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          id,
          name,
          color,
          collection_files(count)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      const collectionsWithCount = data.map(collection => ({
        ...collection,
        file_count: collection.collection_files[0]?.count || 0
      }));
      
      setCollections(collectionsWithCount);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getPlanDisplay = (plan) => {
    const plans = {
      free: { name: 'Free Plan', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-700', limit: 10, price: '$0/mo' },
      pro: { name: 'Pro Plan', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-700', limit: 25, price: '$9/mo' },
      legend: { name: 'Legend', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-700', limit: 50, price: '$15/mo' }
    };
    return plans[plan] || plans.free;
  };

  const getPlanIcon = (plan) => {
    if (plan === 'legend') return Crown;
    if (plan === 'pro') return Sparkles;
    return null;
  };

  const planInfo = getPlanDisplay(userPlan);
  const PlanIcon = getPlanIcon(userPlan);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        w-80 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <button
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02]"
            onClick={() => {
              onNewChat();
            }}
          >
            <Plus size={18} />
            <span className="font-medium">New Chat</span>
          </button>
        </div>

        {/* Chat Sessions List */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <MessageCircle size={16} />
            Recent Chats
          </h3>
          
          {loading ? (
            <div className="text-center text-gray-500 py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Loading conversations...</p>
            </div>
          ) : chatSessions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <FileText size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="font-medium mb-1">No conversations yet</p>
              <p className="text-sm">Upload a document to start chatting</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  className={`
                    group relative p-3 rounded-xl cursor-pointer transition-all duration-200
                    ${activeSession === session.id 
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 shadow-sm' 
                      : 'hover:bg-gray-50 hover:shadow-sm'
                    }
                  `}
                  onClick={() => handleSessionClick(session)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-gray-100 rounded-lg">
                          {session.fileCount > 1 ? (
                            <Files size={12} className="text-gray-600" />
                          ) : (
                            <FileText size={12} className="text-gray-600" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {session.displayName}
                        </span>
                        {session.fileCount > 1 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                            {session.fileCount}
                          </span>
                        )}
                      </div>
                      
                      {/* Show file names for multiple files */}
                      {session.fileCount > 1 && session.attachedFiles && (
                        <div className="mb-2 text-xs text-gray-500">
                          {session.attachedFiles.slice(0, 2).map((file, index) => (
                            <div key={index} className="truncate">
                              • {file.original_name}
                            </div>
                          ))}
                          {session.attachedFiles.length > 2 && (
                            <div className="text-gray-400">
                              +{session.attachedFiles.length - 2} more files
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <MessageCircle size={10} />
                        <span>{session.messages?.length || 0} messages</span>
                        <span>•</span>
                        <span>{format(new Date(session.updated_at), 'MMM d')}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteSession(session.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition-all duration-200 ml-2"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Profile Section */}
        <div className="border-t border-gray-200 p-4">
          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <User size={14} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-32">
                    {user?.email?.split('@')[0] || 'User'}
                  </p>
                  <div className={`flex items-center gap-1 ${planInfo.bgColor} ${planInfo.textColor} px-2 py-0.5 rounded-full`}>
                    {PlanIcon && <PlanIcon className="w-3 h-3" />}
                    <span className="text-xs font-medium">{planInfo.name}</span>
                    <span className="text-xs opacity-75">({planInfo.price})</span>
                  </div>
                </div>
              </div>
              <ChevronDown 
                size={16} 
                className={`text-gray-400 transition-transform duration-200 ${
                  showUserMenu ? 'rotate-180' : ''
                }`} 
              />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-500">Signed in as</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                </div>
                
                <button
                  onClick={() => router.push('/settings')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings size={16} />
                  Settings
                </button>
                
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
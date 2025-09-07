import { useState, useRef, useEffect } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Send, Bot, User, Loader2, Eye, FileText, Image as ImageIcon, File, Download, ExternalLink, Plus, Paperclip, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import FileUpload from './FileUpload';
import PromptSuggestions from './PromptSuggestions';
import MessageContent from './MessageContent';
import { usageTracker } from '../utils/usageTracker';

const FilePreviewModal = ({ files, isOpen, onClose, initialFileIndex = 0 }) => {
  const [currentFileIndex, setCurrentFileIndex] = useState(initialFileIndex);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const supabase = useSupabaseClient();

  const currentFile = files && files.length > 0 ? files[currentFileIndex] : null;

  useEffect(() => {
    if (isOpen && currentFile) {
      setImageError(false);
      setImageLoading(true);
      setIsLoadingUrl(true);
      generateSignedUrl();
    }
  }, [isOpen, currentFile, currentFileIndex]);

  useEffect(() => {
    setCurrentFileIndex(initialFileIndex);
  }, [initialFileIndex]);

  const generateSignedUrl = async () => {
    if (!currentFile) return;
    
    try {
      setIsLoadingUrl(true);
      
      let filePath = currentFile.file_path || `${currentFile.user_id}/${currentFile.file_name || currentFile.id}`;
      
      if (currentFile.file_url && currentFile.file_url.includes('/storage/v1/object/public/')) {
        const urlParts = currentFile.file_url.split('/storage/v1/object/public/documents/');
        if (urlParts.length > 1) {
          filePath = urlParts[1];
        }
      }

      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600);

      if (error) {
        console.error('Error generating signed URL:', error);
        setFileUrl(currentFile.file_url);
      } else {
        setFileUrl(data.signedUrl);
      }
    } catch (error) {
      console.error('Error in generateSignedUrl:', error);
      setFileUrl(currentFile.file_url);
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handlePrevFile = () => {
    if (files && files.length > 1 && currentFileIndex > 0) {
      setCurrentFileIndex(currentFileIndex - 1);
    }
  };

  const handleNextFile = () => {
    if (files && files.length > 1 && currentFileIndex < files.length - 1) {
      setCurrentFileIndex(currentFileIndex + 1);
    }
  };

  if (!isOpen || !currentFile) return null;

  const isImage = currentFile.file_type?.startsWith('image/');
  const isPdf = currentFile.file_type === 'application/pdf';
  const isDoc = currentFile.file_type?.includes('wordprocessing') || currentFile.file_type === 'application/msword';

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = (e) => {
    setImageError(true);
    setImageLoading(false);
    console.error('Image failed to load:', e.target.src);
  };

  const handleDownload = async () => {
    if (!fileUrl) {
      toast.error('File URL not available');
      return;
    }

    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentFile.original_name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      window.open(fileUrl, '_blank');
    }
  };

  const handleOpenInNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    } else {
      toast.error('File URL not available');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full h-full sm:max-w-5xl sm:max-h-[95vh] sm:min-w-[600px] sm:h-auto overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-3 sm:p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isImage && <ImageIcon size={20} className="text-blue-600" />}
            {isPdf && <FileText size={20} className="text-red-600" />}
            {!isImage && !isPdf && <File size={20} className="text-gray-600" />}
            <h3 className="text-sm sm:text-lg font-semibold truncate">{currentFile.original_name}</h3>
            {files && files.length > 1 && (
              <span className="text-xs sm:text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded">
                {currentFileIndex + 1} of {files.length}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Navigation buttons for multiple files */}
            {files && files.length > 1 && (
              <>
                <button
                  onClick={handlePrevFile}
                  disabled={currentFileIndex === 0}
                  className="p-1.5 sm:p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous file"
                >
                  <ChevronLeft size={16} className="sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={handleNextFile}
                  disabled={currentFileIndex === files.length - 1}
                  className="p-1.5 sm:p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next file"
                >
                  <ChevronRight size={16} className="sm:w-4 sm:h-4" />
                </button>
              </>
            )}
            
            <button
              onClick={handleDownload}
              disabled={!fileUrl || isLoadingUrl}
              className="p-1.5 sm:p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              title="Download file"
            >
              <Download size={16} className="sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={handleOpenInNewTab}
              disabled={!fileUrl || isLoadingUrl}
              className="p-1.5 sm:p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              title="Open in new tab"
            >
              <ExternalLink size={16} className="sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-bold text-lg sm:text-xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoadingUrl ? (
            <div className="p-4 flex items-center justify-center min-h-[300px] sm:min-h-[400px] bg-gray-50">
              <div className="text-center">
                <Loader2 size={32} className="animate-spin text-blue-600 mb-2" />
                <p className="text-gray-600">Loading file...</p>
              </div>
            </div>
          ) : isImage ? (
            <div className="p-2 sm:p-4 flex items-center justify-center min-h-[300px] sm:min-h-[400px] bg-gray-50">
              {imageLoading && !imageError && (
                <div className="text-center">
                  <Loader2 size={32} className="animate-spin text-blue-600 mb-2" />
                  <p className="text-gray-600">Loading image...</p>
                </div>
              )}
              {imageError ? (
                <div className="text-center py-8">
                  <ImageIcon size={48} className="mx-auto text-red-400 mb-4" />
                  <p className="text-red-600 mb-2">Failed to load image</p>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Download File
                  </button>
                </div>
              ) : (
                <img
                  src={fileUrl}
                  alt={currentFile.original_name}
                  className={`max-w-full max-h-[60vh] sm:max-h-[70vh] object-contain rounded-lg shadow-lg ${imageLoading ? 'hidden' : ''}`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  crossOrigin="anonymous"
                />
              )}
            </div>
          ) : isPdf ? (
            <div className="h-[60vh] sm:h-[70vh]">
              {fileUrl ? (
                <iframe
                  src={`${fileUrl}#view=FitH`}
                  className="w-full h-full border-0"
                  title={currentFile.original_name}
                  onError={() => {
                    toast.error('PDF preview not available. Click download to view the file.');
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileText size={48} className="mx-auto text-red-400 mb-4" />
                    <p className="text-red-600 mb-2">PDF preview not available</p>
                    <button
                      onClick={handleDownload}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Download PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 sm:p-8 text-center bg-gray-50 min-h-[300px] sm:min-h-[400px] flex items-center justify-center">
              <div>
                <File size={48} className="sm:w-16 sm:h-16 mx-auto text-gray-400 mb-4" />
                <h4 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">Preview not available</h4>
                <p className="text-sm sm:text-base text-gray-600 mb-4">This file type cannot be previewed in the browser</p>
                <div className="space-y-2 text-xs sm:text-sm text-gray-500 mb-6">
                  <p><strong>File:</strong> {currentFile.original_name}</p>
                  <p><strong>Type:</strong> {currentFile.file_type}</p>
                  <p><strong>Size:</strong> {(currentFile.file_size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  onClick={handleDownload}
                  disabled={!fileUrl}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Download size={16} className="sm:w-4 sm:h-4" />
                  Download File
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-2 sm:p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0">
          <span>Size: {(currentFile.file_size / 1024 / 1024).toFixed(2)} MB</span>
          <span>Type: {currentFile.file_type}</span>
          <span>Uploaded: {new Date(currentFile.upload_date).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};

export default function ChatInterface({ sessionId, fileId, onFileUpload, currentFile, isNewChat = false, onNewChat }) {
  const user = useUser();
  const supabase = useSupabaseClient();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dailyUsage, setDailyUsage] = useState({ used: 0, limit: 10 });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [previewFileIndex, setPreviewFileIndex] = useState(0);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {    
    if (sessionId && !isNewChat) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [sessionId, isNewChat]);

  useEffect(() => {
    checkDailyUsage();
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadFiles = async () => {
      setFilesLoaded(false);
      
      if (isNewChat) {
        setAttachedFiles([]);
        setMessages([]);
        setInputMessage('');
        setShowFileUpload(false);
        setFilesLoaded(true);
      } else if (sessionId) {
        await fetchSessionFiles();
      } else if (currentFile) {
        setAttachedFiles([currentFile]);
        setFilesLoaded(true);
      } else {
        setAttachedFiles([]);
        setFilesLoaded(true);
      }
    };

    loadFiles();
  }, [isNewChat, currentFile, sessionId]);

  const fetchSessionFiles = async () => {
    if (!sessionId) {
      setFilesLoaded(true);
      return;
    }
    
    try {
      const { data: sessionFilesData, error: sessionFilesError } = await supabase
        .from('session_files')
        .select(`
          file_id,
          files (
            id,
            original_name,
            file_type,
            file_size,
            file_url,
            file_path,
            filename,
            user_id,
            upload_date
          )
        `)
        .eq('session_id', sessionId)
        .order('added_at', { ascending: true });

      if (sessionFilesError) {
        console.error('Error fetching session files:', sessionFilesError);
        throw sessionFilesError;
      }
      
      const sessionFiles = sessionFilesData
        ?.map(item => item.files)
        .filter(Boolean) || [];

      console.log('Loaded session files:', sessionFiles.length, sessionFiles);

      if (sessionFiles.length > 0) {
        setAttachedFiles(sessionFiles);
      } else if (currentFile) {
        console.log('No session files found, using currentFile:', currentFile);
        setAttachedFiles([currentFile]);
        
        try {
          await supabase
            .from('session_files')
            .upsert({
              session_id: sessionId,
              file_id: currentFile.id
            }, {
              onConflict: 'session_id,file_id',
              ignoreDuplicates: true
            });
        } catch (upsertError) {
          console.error('Error adding currentFile to session:', upsertError);
        }
      } else {
        setAttachedFiles([]);
      }
      
    } catch (error) {
      console.error('Error in fetchSessionFiles:', error);
      
      if (currentFile) {
        console.log('Using currentFile as fallback due to error:', currentFile);
        setAttachedFiles([currentFile]);
      } else {
        setAttachedFiles([]);
      }
    } finally {
      setFilesLoaded(true);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!sessionId) return;
        
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load chat history');
    }
  };

  const checkDailyUsage = async () => {
    if (!user) return;
    
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
      }

      const subscriptionTier = userData?.subscription_tier || 'free';
      
      const currentUsageData = await usageTracker.getCurrentUsage(user.id);
      
      const limits = {
        free: 10,
        pro: 25,
        legend: 50
      };

      const limit = limits[subscriptionTier] || limits.free;
      
      setDailyUsage({
        used: currentUsageData.dailyPromptsUsed,
        limit: limit
      });

      console.log('Daily usage updated:', {
        used: currentUsageData.dailyPromptsUsed,
        limit: limit,
        tier: subscriptionTier
      });

    } catch (error) {
      console.error('Error checking daily usage:', error);
      
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error: dbError } = await supabase
          .from('daily_usage')
          .select('prompts_used')
          .eq('user_id', user.id)
          .eq('usage_date', today)
          .maybeSingle();

        if (dbError && dbError.code !== 'PGRST116') {
          console.error('Fallback usage check failed:', dbError);
        }
        
        setDailyUsage({
          used: data?.prompts_used || 0,
          limit: 10
        });
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        setDailyUsage({ used: 0, limit: 10 });
      }
    }
  };

  const handleFileUpload = async (fileRecord) => {
    try {
      if (attachedFiles.length >= 2) {
        toast.error('Maximum 2 files allowed per session');
        return;
      }

      const files = Array.isArray(fileRecord) ? fileRecord : [fileRecord];
      const firstFile = files[0];
      
      let sessionName;
      if (files.length === 1) {
        sessionName = firstFile.original_name;
      } else {
        sessionName = `${files.length} files: ${firstFile.original_name}${files.length > 1 ? ' +' + (files.length - 1) + ' more' : ''}`;
      }

      if (isNewChat || !sessionId) {
        const { data: session, error } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            session_name: sessionName || 'New Chat'
          })
          .select()
          .single();

        if (error) throw error;

        for (const file of files) {
          await supabase
            .from('session_files')
            .insert({
              session_id: session.id,
              file_id: file.id
            });
        }

        onFileUpload?.(firstFile, session);
        
        if (files.length === 1) {
          toast.success(`File "${firstFile.original_name}" uploaded successfully!`);
        } else {
          toast.success(`${files.length} files uploaded successfully!`);
        }
      } else {
        for (const file of files) {
          await supabase
            .from('session_files')
            .insert({
              session_id: sessionId,
              file_id: file.id
            });
          
          handleAddFile(file);
        }
      }
    } catch (error) {
      console.error('Error creating chat session:', error);
      toast.error('Failed to create chat session');
    }
  };

  const handleAddFile = async (fileRecord) => {
    if (attachedFiles.length >= 2) {
      toast.error('Maximum 2 files allowed per session');
      return;
    }

    try {
      if (sessionId) {
        const { error } = await supabase
          .from('session_files')
          .upsert({
            session_id: sessionId,
            file_id: fileRecord.id
          }, {
            onConflict: 'session_id,file_id',
            ignoreDuplicates: true
          });

        if (error) {
          console.error('Error adding file to session:', error);
          throw error;
        }
      }

      setAttachedFiles(prev => {
        if (prev.some(f => f.id === fileRecord.id)) {
          return prev;
        }
        return [...prev, fileRecord];
      });
      
      setShowFileUpload(false);
      toast.success(`"${fileRecord.original_name}" added to conversation`);
      
      if (sessionId) {
        setTimeout(() => {
          fetchSessionFiles();
        }, 500);
      }
      
    } catch (error) {
      console.error('Error in handleAddFile:', error);
      toast.error('Failed to add file to conversation');
    }
  };

  const removeAttachedFile = async (fileId) => {
    try {
      if (sessionId) {
        const { error } = await supabase
          .from('session_files')
          .delete()
          .eq('session_id', sessionId)
          .eq('file_id', fileId);

        if (error) {
          console.error('Error removing file from session:', error);
          throw error;
        }
      }
      
      setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success('File removed from conversation');
      
    } catch (error) {
      console.error('Error removing file:', error);
      toast.error('Failed to remove file');
    }
  };

  const openPreview = (file) => {
    const fileIndex = attachedFiles.findIndex(f => f.id === file.id);
    setPreviewFiles(attachedFiles);
    setPreviewFileIndex(fileIndex >= 0 ? fileIndex : 0);
    setPreviewOpen(true);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    if (dailyUsage.used >= dailyUsage.limit) {
      toast.error('Daily prompt limit reached. Please try again tomorrow.');
      return;
    }

    if (!sessionId && attachedFiles.length === 0) {
      toast.error('Please upload a document first to start chatting');
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    let tempUserMessage = null;

    try {
      tempUserMessage = {
        id: `temp-user-${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
        attachedFiles: attachedFiles.length > 1 ? attachedFiles.map(f => ({
          id: f.id,
          name: f.original_name,
          type: f.file_type
        })) : null
      };
      setMessages(prev => [...prev, tempUserMessage]);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId,
          fileId: attachedFiles[0]?.id || fileId,
          attachedFiles: attachedFiles.map(f => f.id)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }

      const data = await response.json();
      
      setMessages(prev => {
        const withoutTemp = prev.filter(msg => msg.id !== tempUserMessage?.id);
        return [
          ...withoutTemp,
          {
            ...data.userMessage,
            attachedFiles: tempUserMessage.attachedFiles
          },
          data.aiMessage
        ];
      });

      setDailyUsage(prev => ({ 
        ...prev, 
        used: prev.used + 1 
      }));

      setTimeout(() => {
        checkDailyUsage();
      }, 1000);

    } catch (error) {
      console.error('Error sending message:', error);
      
      if (error.message.includes('limit')) {
        await checkDailyUsage();
        toast.error(error.message);
      } else {
        toast.error('Failed to send message. Please try again.');
      }
      
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) {
      return <ImageIcon size={16} className="text-blue-600" />;
    } else if (fileType === 'application/pdf') {
      return <FileText size={16} className="text-red-600" />;
    } else {
      return <File size={16} className="text-gray-600" />;
    }
  };

  const shouldShowUploadInterface = () => {
    return (isNewChat || !sessionId) && attachedFiles.length === 0 && filesLoaded;
  };

  const shouldShowReadyMessage = () => {
    return attachedFiles.length > 0 && messages.length === 0 && !isLoading && sessionId && filesLoaded;
  };

  const getReadyMessage = () => {
    if (attachedFiles.length === 0) return null;

    const hasImages = attachedFiles.some(f => f.file_type?.startsWith('image/'));
    const hasDocuments = attachedFiles.some(f => !f.file_type?.startsWith('image/'));
    
    if (attachedFiles.length === 1) {
      return {
        title: attachedFiles[0].file_type?.startsWith('image/') ? 'Image Ready!' : 'Document Ready!',
        description: `Your ${attachedFiles[0].file_type?.startsWith('image/') ? 'image has' : 'document has'} been successfully processed and analyzed.`
      };
    } else {
      let title = 'Files Ready!';
      let description = 'Your files have been successfully processed and analyzed.';
      
      if (hasImages && hasDocuments) {
        description = 'Your images and documents have been successfully processed and analyzed.';
      } else if (hasImages) {
        description = 'Your images have been successfully processed and analyzed.';
      }
      
      return { title, description };
    }
  };

  const readyMessage = getReadyMessage();

  if (!filesLoaded) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="bg-blue-50 border-b border-blue-200 px-3 sm:px-4 py-2 text-xs sm:text-sm text-blue-700 flex justify-between items-center">
          <div>Loading...</div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={48} className="mx-auto text-blue-500 animate-spin mb-4" />
            <p className="text-gray-600">Loading chat session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden chat-interface-mobile">
      {/* Usage indicator - Mobile optimized with horizontal scroll */}
      <div className="bg-blue-50 border-b border-blue-200 px-2 sm:px-4 py-2 text-xs sm:text-sm text-blue-700 flex-shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="font-medium">Daily prompts:</span>
            <span>{dailyUsage.used}/{dailyUsage.limit}</span>
            {dailyUsage.used >= dailyUsage.limit && (
              <span className="text-red-600 font-medium text-xs">Limit reached</span>
            )}
          </div>
          
          {/* Attached Files Display - Mobile optimized with horizontal scroll */}
          {attachedFiles.length > 0 && (
            <div className="w-full sm:w-auto overflow-x-auto mobile-file-attachments">
              <div className="flex items-center gap-1 min-w-max sm:min-w-0">
                {attachedFiles.slice(0, 2).map((file, index) => (
                  <div key={file.id} className="text-xs bg-white px-2 py-1 rounded border border-blue-200 flex items-center gap-1 hover:shadow-sm transition-shadow flex-shrink-0">
                    {getFileIcon(file.file_type)}
                    <span className="truncate max-w-[80px] sm:max-w-[100px] font-medium">{file.original_name}</span>
                    <button
                      onClick={() => openPreview(file)}
                      className="text-blue-600 hover:text-blue-800 p-0.5 rounded hover:bg-blue-100 transition-colors flex-shrink-0"
                      title="Preview file"
                    >
                      <Eye size={10} className="sm:w-3 sm:h-3" />
                    </button>
                    <button
                      onClick={() => removeAttachedFile(file.id)}
                      className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-red-100 transition-colors flex-shrink-0"
                      title="Remove file"
                    >
                      <X size={10} className="sm:w-3 sm:h-3" />
                    </button>
                  </div>
                ))}
                {attachedFiles.length > 1 && (
                  <span className="text-xs text-gray-500 flex-shrink-0">{attachedFiles.length}/2</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      <FilePreviewModal
        files={previewFiles}
        isOpen={previewOpen}
        initialFileIndex={previewFileIndex}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewFiles([]);
          setPreviewFileIndex(0);
        }}
      />

      {/* Messages - Mobile optimized with proper scrolling */}
      <div className="flex-1 overflow-y-auto overflow-x-auto px-2 sm:px-4 space-y-3 sm:space-y-4 chat-scroll chat-messages-container
                min-h-0">
        {shouldShowUploadInterface() ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="mb-6 sm:mb-8 w-full max-w-md">
              <FileUpload 
                onUpload={handleFileUpload} 
                maxFiles={2}
                maxFileSize={10 * 1024 * 1024}
              />
            </div>
            <div className="text-gray-500">
              <Bot size={40} className="sm:w-12 sm:h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-base sm:text-lg font-medium mb-2">Welcome to DocuMind</h3>
              <p className="text-sm sm:text-base">Upload documents and start asking questions</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-2">Maximum 2 files, 10MB each</p>
            </div>
          </div>
        ) : shouldShowReadyMessage() ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="max-w-md mx-auto w-full">
              <div className="bg-green-100 rounded-full p-3 sm:p-4 w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                {readyMessage?.title}
              </h3>
              <div className="bg-blue-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 w-full">
                {attachedFiles.length === 1 ? (
                  <div className="flex items-center justify-center gap-2 text-blue-800">
                    {getFileIcon(attachedFiles[0]?.file_type)}
                    <span className="font-medium truncate text-sm sm:text-base max-w-[180px] sm:max-w-xs">{attachedFiles[0]?.original_name}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-blue-800 font-medium text-center mb-2 text-sm sm:text-base">
                      {attachedFiles.length} files attached
                    </div>
                    <div className="grid grid-cols-1 gap-2 w-full">
                      {attachedFiles.map((file, index) => (
                        <div key={file.id} className="flex items-center gap-2 text-blue-700 bg-blue-100 px-2 sm:px-3 py-1 rounded text-xs sm:text-sm w-full">
                          {getFileIcon(file.file_type)}
                          <span className="truncate max-w-[180px] sm:max-w-xs font-medium">{file.original_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                {readyMessage?.description} You can now ask questions about the content, request summaries, 
                or explore specific sections.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-2 sm:gap-3 w-full min-w-0 mobile-message ${
                message.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div className={`
                flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center
                ${message.role === 'user' ? 'bg-blue-600' : 'bg-gray-600'}
              `}>
                {message.role === 'user' ? (
                  <User size={14} className="sm:w-4 sm:h-4 text-white" />
                ) : (
                  <Bot size={14} className="sm:w-4 sm:h-4 text-white" />
                )}
              </div>
              <div className={`
                flex-1 min-w-0 space-y-2 max-w-[calc(100%-3rem)] sm:max-w-[80%]
              `}>
                {/* Attached files indicator for user messages */}
                {message.role === 'user' && message.attachedFiles && (
                  <div className="flex flex-wrap gap-1 justify-end overflow-x-auto">
                    {message.attachedFiles.map((file, index) => (
                      <div key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1 flex-shrink-0">
                        {getFileIcon(file.type)}
                        <span className="truncate max-w-[80px] sm:max-w-[120px]">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className={`
                  p-2 sm:p-3 rounded-lg text-sm sm:text-base break-words overflow-wrap-anywhere w-full
                  ${message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                  }
                `}>
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap break-words overflow-wrap-anywhere w-full">{message.content}</p>
                  ) : (
                    <div className="w-full overflow-x-auto">
                      <MessageContent content={message.content} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex items-start gap-2 sm:gap-3 w-full min-w-0">
            <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-600 flex items-center justify-center">
              <Bot size={14} className="sm:w-4 sm:h-4 text-white" />
            </div>
            <div className="bg-gray-100 p-2 sm:p-3 rounded-lg min-w-0 flex-1 max-w-[calc(100%-3rem)] sm:max-w-[80%]">
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin" />
                <span className="text-gray-600 text-sm sm:text-base">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions - Mobile optimized with horizontal scroll */}
      {attachedFiles.length > 0 && attachedFiles[0]?.id && !shouldShowUploadInterface() && (
        <div className="px-2 sm:px-4 mt-2 flex-shrink-0">
          {/* Suggestions wrapper */}
          <div className="flex gap-2 max-h-24 sm:max-h-28 overflow-x-auto mobile-suggestions">
            <PromptSuggestions 
              fileId={attachedFiles[0].id} 
              onSelectSuggestion={setInputMessage}
            />
          </div>
        </div>
      )}



      {/* File Upload Area - Mobile optimized */}
      {showFileUpload && !shouldShowUploadInterface() && attachedFiles.length < 2 && (
        <div className="border-t border-gray-200 p-2 sm:p-4 bg-gray-50 flex-shrink-0">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-gray-700 text-sm sm:text-base">Add another file</h4>
            <button
              onClick={() => setShowFileUpload(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <FileUpload 
              onUpload={handleAddFile} 
              inChat={true}
              onAddFile={handleAddFile}
              maxFiles={1}
              maxFileSize={10 * 1024 * 1024}
            />
          </div>
        </div>
      )}

      {/* Input - Mobile optimized with horizontal scroll */}
      <div className="border-t border-gray-200 p-2 sm:p-4 safe-area-bottom bg-white sticky bottom-0 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 w-full min-w-0 mobile-input-container">
          {/* Textarea (takes remaining space, can shrink) */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                attachedFiles.length === 0
                  ? "Please upload a document first..."
                  : dailyUsage.used >= dailyUsage.limit
                  ? "Daily limit reached - try again tomorrow"
                  : attachedFiles.length === 1
                  ? `Ask about the ${
                      attachedFiles[0].file_type?.startsWith("image/") ? "image" : "document"
                    }...`
                  : `Ask about your ${attachedFiles.length} files...`
              }
              disabled={isLoading || dailyUsage.used >= dailyUsage.limit || attachedFiles.length === 0}
              className="w-full px-2 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg
                        resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        disabled:bg-gray-100 disabled:cursor-not-allowed text-sm sm:text-base
                        overflow-auto min-w-0"
              rows={1}
              style={{ maxHeight: "100px" }}
              onInput={(e) => {
                // optional: auto-grow up to maxHeight
                e.currentTarget.style.height = "auto";
                e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 100)}px`;
              }}
            />
          </div>

          {/* Add file button */}
          {!showFileUpload && attachedFiles.length > 0 && attachedFiles.length < 2 ? (
            <button
              onClick={() => setShowFileUpload(true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 sm:p-3 rounded-lg transition-colors flex-shrink-0"
              title="Add another file"
            >
              <Paperclip size={18} className="sm:w-5 sm:h-5" />
            </button>
          ) : null}

          {/* Send button (always visible) */}
          <button
            onClick={sendMessage}
            disabled={
              !inputMessage.trim() ||
              isLoading ||
              dailyUsage.used >= dailyUsage.limit ||
              attachedFiles.length === 0
            }
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                      text-white p-2 sm:p-3 rounded-lg transition-colors flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 size={18} className="sm:w-5 sm:h-5 animate-spin" />
            ) : (
              <Send size={18} className="sm:w-5 sm:h-5" />
            )}
          </button>
        </div>
      </div>


    </div>
  );
}
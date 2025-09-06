import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Upload, FileText, Image, X, Loader2, FileSpreadsheet, Presentation, Crown, Lock, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { usageTracker } from '../utils/usageTracker';

export default function FileUpload({ onUpload }) {
  const user = useUser();
  const supabase = useSupabaseClient();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userPlan, setUserPlan] = useState('free');

  // Fetch user's subscription plan
  useEffect(() => {
    const fetchUserPlan = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('subscription_tier')
            .eq('id', user.id)
            .single();
          
          if (error) throw error;
          setUserPlan(data.subscription_tier || 'free');
        } catch (error) {
          console.error('Error fetching user plan:', error);
          setUserPlan('free');
        }
      }
    };
    
    fetchUserPlan();
  }, [user, supabase]);

  // Get file size limit based on plan
  const getFileSizeLimit = (plan) => {
    switch (plan) {
      case 'legend': return 50 * 1024 * 1024;
      case 'pro': return 25 * 1024 * 1024;
      case 'free':
      default: return 10 * 1024 * 1024;
    }
  };

  // Get file size limit text
  const getFileSizeLimitText = (plan) => {
    switch (plan) {
      case 'legend': return '50MB';
      case 'pro': return '25MB';
      case 'free':
      default: return '10MB';
    }
  };

  // Check if advanced file types are supported
  const supportsAdvancedTypes = (plan) => {
    return plan === 'pro' || plan === 'legend';
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const fileSizeLimit = getFileSizeLimit(userPlan);
    const fileName = file.name.toLowerCase();

    // Validate file size based on user plan
    if (file.size > fileSizeLimit) {
      const limitText = getFileSizeLimitText(userPlan);
      if (userPlan === 'free') {
        toast.error(`File size must be less than ${limitText}. Upgrade to Pro for 25MB or Legend for 50MB limits.`);
      } else if (userPlan === 'pro') {
        toast.error(`File size must be less than ${limitText}. Upgrade to Legend for 50MB limit.`);
      } else {
        toast.error(`File size must be less than ${limitText}`);
      }
      return;
    }

    // Define file type support based on plan
    const basicTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    const advancedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    const allowedTypes = supportsAdvancedTypes(userPlan) 
      ? [...basicTypes, ...advancedTypes] 
      : basicTypes;

    // Check for Excel/PowerPoint files for free users
    const isAdvancedFile = fileName.endsWith('.xlsx') || 
                          fileName.endsWith('.xls') ||
                          fileName.endsWith('.pptx') ||
                          fileName.endsWith('.ppt') ||
                          advancedTypes.includes(file.type);

    if (isAdvancedFile && !supportsAdvancedTypes(userPlan)) {
      toast.error('Excel and PowerPoint files are only supported in Pro and Legend plans. Upgrade to unlock these features!');
      return;
    }

    // Validate file type
    const isValidType = allowedTypes.includes(file.type) || 
                       (supportsAdvancedTypes(userPlan) && (
                         fileName.endsWith('.xlsx') || 
                         fileName.endsWith('.xls') ||
                         fileName.endsWith('.pptx') ||
                         fileName.endsWith('.ppt')
                       ));

    if (!isValidType) {
      const supportedFormats = supportsAdvancedTypes(userPlan)
        ? 'PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, or image files'
        : 'PDF, DOC, DOCX, or image files';
      toast.error(`Unsupported file type. Please upload ${supportedFormats}.`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          onUploadProgress: (progress) => {
            setUploadProgress((progress.loaded / progress.total) * 40); // First 40% for upload
          }
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      setUploadProgress(50); // Progress update

      // Extract text content (send to API endpoint)
      const formData = new FormData();
      formData.append('file', file);

      const extractResponse = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });

      const extractResult = await extractResponse.json();
      const { extractedText, imageData, metadata, fileType } = extractResult;

      setUploadProgress(75); // Progress update

      // Save file record to database with metadata
      const fileRecord = {
        user_id: user.id,
        filename: fileName,
        original_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: publicUrl,
        extracted_text: extractedText,
        metadata: metadata ? JSON.stringify(metadata) : null
      };

      // Add image data for image files
      if (imageData) {
        fileRecord.image_data = JSON.stringify(imageData);
      }

      const { data: savedFile, error: dbError } = await supabase
        .from('files')
        .insert(fileRecord)
        .select()
        .single();

      if (dbError) throw dbError;

      // Track file upload after successful save
      if (user && savedFile) {
        await usageTracker.trackFileUpload(user.id, savedFile.id);
      }

      setUploadProgress(100);
      
      // Show success message based on file type
      const fileTypeMessages = {
        'spreadsheet': `Excel file "${file.name}" processed successfully! ${metadata?.sheetCount || 0} sheets analyzed.`,
        'presentation': `PowerPoint file "${file.name}" processed successfully! ${metadata?.slideCount || 0} slides analyzed.`,
        'image': `Image "${file.name}" processed successfully! OCR ${metadata?.hasOCR ? 'completed' : 'attempted'}.`,
        'pdf': `PDF "${file.name}" processed successfully! ${metadata?.pages || 0} pages analyzed.`,
        'document': `Document "${file.name}" processed successfully!`
      };
      
      toast.success(fileTypeMessages[fileType] || 'File uploaded and processed successfully!');
      onUpload?.(savedFile);

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [user, supabase, onUpload, userPlan]);

  // Define accepted file types based on user plan
  const getAcceptedTypes = () => {
    const basicAcceptedTypes = {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp']
    };

    if (supportsAdvancedTypes(userPlan)) {
      return {
        ...basicAcceptedTypes,
        'application/vnd.ms-excel': ['.xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        'application/vnd.ms-powerpoint': ['.ppt'],
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
      };
    }

    return basicAcceptedTypes;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: getAcceptedTypes(),
    multiple: false,
    disabled: uploading
  });

  const renderFileTypeSupport = () => {
    return (
      <div className="text-sm text-gray-500 space-y-1">
        <p>📄 Documents: PDF, DOC, DOCX</p>
        <div className="flex items-center gap-2">
          <span>📊 Spreadsheets: XLS, XLSX</span>
          {!supportsAdvancedTypes(userPlan) && (
            <div className="flex items-center gap-1 text-xs text-purple-600">
              <Crown className="w-3 h-3" />
              <span>Pro+</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>📊 Presentations: PPT, PPTX</span>
          {!supportsAdvancedTypes(userPlan) && (
            <div className="flex items-center gap-1 text-xs text-purple-600">
              <Crown className="w-3 h-3" />
              <span>Pro+</span>
            </div>
          )}
        </div>
        <p>🖼️ Images: JPG, PNG, GIF, WebP</p>
      </div>
    );
  };

  const renderFileSizeInfo = () => {
    const currentLimit = getFileSizeLimitText(userPlan);
    
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-400">Max file size: {currentLimit}</span>
        {userPlan !== 'legend' && (
          <div className="flex items-center gap-1 text-purple-600">
            <Crown className="w-3 h-3" />
            <span>{userPlan === 'free' ? 'Pro: 25MB, Legend: 50MB' : 'Legend: 50MB'}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="space-y-4">
            <Loader2 size={48} className="mx-auto text-blue-500 animate-spin" />
            <div>
              <p className="text-gray-600 mb-2">
                {uploadProgress < 40 ? 'Uploading...' : 
                 uploadProgress < 75 ? 'Processing...' : 'Finalizing...'}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">{Math.round(uploadProgress)}%</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center space-x-2">
              <FileText size={28} className="text-gray-400" />
              <div className="relative">
                <FileSpreadsheet size={28} className={supportsAdvancedTypes(userPlan) ? "text-green-500" : "text-gray-300"} />
                {!supportsAdvancedTypes(userPlan) && (
                  <Lock size={12} className="absolute -top-1 -right-1 text-purple-500 bg-white rounded-full" />
                )}
              </div>
              <div className="relative">
                <Presentation size={28} className={supportsAdvancedTypes(userPlan) ? "text-orange-500" : "text-gray-300"} />
                {!supportsAdvancedTypes(userPlan) && (
                  <Lock size={12} className="absolute -top-1 -right-1 text-purple-500 bg-white rounded-full" />
                )}
              </div>
              <Image size={28} className="text-blue-400" />
            </div>
            
            {isDragActive ? (
              <p className="text-blue-600 font-medium">Drop the file here...</p>
            ) : (
              <div>
                <p className="text-gray-600 font-medium mb-2">
                  Drag & drop a file here, or click to select
                </p>
                {renderFileTypeSupport()}
                {renderFileSizeInfo()}
                <p className="text-xs text-blue-600 mt-2">
                  ✨ Advanced AI analysis for all formats!
                </p>
                
                {/* Upgrade prompt for free users */}
                {userPlan === 'free' && (
                  <div className="mt-3 p-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-center gap-2 text-xs text-purple-700">
                      <Crown className="w-4 h-4" />
                      <span>Upgrade to Pro for Excel/PowerPoint + 25MB files</span>
                    </div>
                  </div>
                )}
                
                {/* Legend upgrade prompt for pro users */}
                {userPlan === 'pro' && (
                  <div className="mt-3 p-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-center gap-2 text-xs text-purple-700">
                      <Crown className="w-4 h-4" />
                      <span>Upgrade to Legend for 50MB files + data export</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <Upload size={24} className="mx-auto text-gray-400" />
          </div>
        )}
      </div>
      
      {/* Plan-based feature info */}
      <div className="mt-4 text-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
          userPlan === 'legend' ? 'bg-purple-100 text-purple-700' :
          userPlan === 'pro' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {userPlan === 'legend' ? <Crown className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
          Current Plan: {userPlan === 'free' ? 'Free' : userPlan === 'pro' ? 'Pro' : 'Legend'}
        </div>
      </div>
    </div>
  );
}
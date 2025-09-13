import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Upload, FileText, Image, Loader2, FileSpreadsheet, Presentation, Sparkles, X, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { usageTracker } from '../utils/usageTracker';

export default function FileUpload({ 
  onUpload, 
  inChat = false, 
  onAddFile = null, 
  maxFiles = 2, 
  maxFileSize = 10 * 1024 * 1024 // 10MB default
}) {
  const user = useUser();
  const supabase = useSupabaseClient();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUpload, setCurrentUpload] = useState(null);
  const [currentStep, setCurrentStep] = useState('');

  const processFile = async (file) => {
    const fileName = file.name.toLowerCase();

    // Validate file size
    if (file.size > maxFileSize) {
      toast.error(`File "${file.name}" exceeds ${Math.round(maxFileSize / 1024 / 1024)}MB limit`);
      return null;
    }

    // Define all supported file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    // Validate file type
    const isValidType = allowedTypes.includes(file.type) || 
                       fileName.endsWith('.xlsx') || 
                       fileName.endsWith('.xls') ||
                       fileName.endsWith('.pptx') ||
                       fileName.endsWith('.ppt');

    if (!isValidType) {
      toast.error(`"${file.name}" is not a supported file type`);
      return null;
    }

    try {
      setCurrentUpload(file.name);
      setUploadProgress(0);
      setCurrentStep('Preparing upload...');
      
      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const storagePath = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      setCurrentStep('Uploading to cloud...');
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          onUploadProgress: (progress) => {
            // More conservative progress tracking for mobile
            if (progress.total > 0) {
              const percent = Math.min((progress.loaded / progress.total) * 30, 30);
              setUploadProgress(percent);
            }
          }
        });

      if (uploadError) throw uploadError;

      setUploadProgress(35);
      setCurrentStep('Getting file URL...');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      setUploadProgress(40);
      setCurrentStep('Processing content...');

      // Extract text content with better error handling for mobile
      const formData = new FormData();
      formData.append('file', file);

      // Add timeout and retry logic for mobile networks
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 120000); // 2 minute timeout for mobile

      let extractResponse;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          setUploadProgress(40 + (retryCount * 5)); // Show some progress on retries
          
          extractResponse = await fetch('/api/extract-text', {
            method: 'POST',
            body: formData,
            signal: controller.signal
          });

          if (extractResponse.ok) {
            break; // Success, exit retry loop
          } else if (extractResponse.status >= 500 && retryCount < maxRetries) {
            // Server error, retry
            retryCount++;
            setCurrentStep(`Retrying content extraction... (${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
            continue;
          } else {
            throw new Error(`Text extraction failed: ${extractResponse.status} ${extractResponse.statusText}`);
          }
        } catch (fetchError) {
          if (fetchError.name === 'AbortError') {
            clearTimeout(timeoutId);
            throw new Error('Upload timed out. Please check your connection and try again.');
          }
          
          if (retryCount < maxRetries) {
            retryCount++;
            setCurrentStep(`Retrying... (${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          } else {
            throw fetchError;
          }
        }
      }

      clearTimeout(timeoutId);
      setUploadProgress(65);
      setCurrentStep('Analyzing content...');

      const extractResult = await extractResponse.json();
      const { extractedText, imageData, metadata, fileType } = extractResult;

      setUploadProgress(80);
      setCurrentStep('Saving to database...');

      // Save file record to database
      const fileRecord = {
        user_id: user.id,
        filename: storagePath,
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

      setUploadProgress(95);
      setCurrentStep('Finalizing...');

      // Track file upload
      if (user && savedFile) {
        try {
          await usageTracker.trackFileUpload(user.id, savedFile.id);
        } catch (trackingError) {
          console.warn('Usage tracking failed:', trackingError);
          // Don't fail the upload for tracking errors
        }
      }

      setUploadProgress(100);
      setCurrentStep('Complete!');

      // Success message - shorter for mobile
      const fileTypeMessages = {
        'spreadsheet': `Excel file processed! ${metadata?.sheetCount || 0} sheets.`,
        'presentation': `PowerPoint processed! ${metadata?.slideCount || 0} slides.`,
        'image': `Image processed! OCR ${metadata?.hasOCR ? 'completed' : 'attempted'}.`,
        'pdf': `PDF processed! ${metadata?.pages || 0} pages.`,
        'document': `Document processed successfully!`
      };
      
      toast.success(fileTypeMessages[fileType] || `File uploaded successfully!`);
      
      return savedFile;

    } catch (error) {
      console.error('Upload error:', error);
      
      // More specific error messages for mobile users
      if (error.message.includes('timed out') || error.message.includes('AbortError')) {
        toast.error(`Upload timed out for "${file.name}". Please check your connection and try again.`);
      } else if (error.message.includes('Text extraction failed')) {
        toast.error(`Upload completed but processing failed for "${file.name}". Please try again.`);
      } else if (error.message.includes('network') || error.message.includes('NetworkError')) {
        toast.error(`Network error uploading "${file.name}". Please check your connection.`);
      } else if (error.message.includes('413') || error.message.includes('too large')) {
        toast.error(`File "${file.name}" is too large. Please compress it and try again.`);
      } else {
        toast.error(`Failed to upload "${file.name}". Please try again.`);
      }
      
      return null;
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles.length) return;

    // Check file count limit
    if (acceptedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed. Processing first ${maxFiles} files.`);
      acceptedFiles = acceptedFiles.slice(0, maxFiles);
    }

    setUploading(true);
    setUploadProgress(0);
    setCurrentStep('');

    try {
      if (inChat && acceptedFiles.length === 1) {
        // Single file upload in chat mode
        const result = await processFile(acceptedFiles[0]);
        if (result && onAddFile) {
          onAddFile(result);
        }
      } else {
        // Multi-file upload for initial upload
        const results = [];
        for (let i = 0; i < acceptedFiles.length; i++) {
          const file = acceptedFiles[i];
          setCurrentStep(`Processing file ${i + 1} of ${acceptedFiles.length}...`);
          const result = await processFile(file);
          if (result) {
            results.push(result);
          }
          
          // Update overall progress for multi-file uploads
          if (acceptedFiles.length > 1) {
            const overallProgress = ((i + 1) / acceptedFiles.length) * 100;
            setUploadProgress(overallProgress);
          }
        }
        
        // Call onUpload with all successful uploads
        if (results.length > 0) {
          onUpload?.(results.length === 1 ? results[0] : results);
        }
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setCurrentUpload(null);
      setCurrentStep('');
    }
  }, [user, supabase, onUpload, inChat, onAddFile, maxFiles]);

  // Define accepted file types
  const acceptedTypes = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    multiple: !inChat && maxFiles > 1,
    disabled: uploading,
    maxSize: maxFileSize
  });

  const renderFileTypeSupport = () => {
    return (
      <div className="text-xs sm:text-sm text-gray-500 space-y-1">
        <p>📄 Documents: PDF, DOC, DOCX</p>
        <p>📊 Spreadsheets: XLS, XLSX</p>
        <p>📊 Presentations: PPT, PPTX</p>
      </div>
    );
  };

  const containerClass = inChat 
    ? "w-full" 
    : "w-full max-w-md mx-auto";

  const dropzoneClass = inChat
    ? `border-2 border-dashed rounded-lg p-3 sm:p-4 text-center cursor-pointer transition-colors
       ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
       ${uploading ? 'pointer-events-none opacity-50' : ''}`
    : `border-2 border-dashed rounded-lg p-4 sm:p-8 text-center cursor-pointer transition-colors
       ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
       ${uploading ? 'pointer-events-none opacity-50' : ''}`;

  const fileSizeText = `${Math.round(maxFileSize / 1024 / 1024)}MB`;

  return (
    <div className={containerClass}>
      <div className={dropzoneClass} {...getRootProps()}>
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="space-y-3 sm:space-y-4">
            <Loader2 size={inChat ? 24 : 40} className="sm:w-12 sm:h-12 mx-auto text-blue-500 animate-spin" />
            <div>
              <p className="text-gray-600 mb-2 text-sm sm:text-base">
                {currentUpload ? `${currentUpload.length > 25 ? currentUpload.substring(0, 25) + '...' : currentUpload}` : 'Processing...'}
              </p>
              {currentStep && (
                <p className="text-xs sm:text-sm text-gray-500 mb-2">{currentStep}</p>
              )}
              <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                <div 
                  className="bg-blue-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">{Math.round(uploadProgress)}%</p>
            </div>
          </div>
        ) : (
          <div className={`space-y-${inChat ? '2' : '3 sm:space-y-4'}`}>
            {inChat ? (
              <div className="flex items-center justify-center gap-2">
                <Plus size={16} className="sm:w-5 sm:h-5 text-gray-400" />
                <span className="text-gray-600 text-xs sm:text-sm">Add another file</span>
              </div>
            ) : (
              <>
                <div className="flex justify-center space-x-2">
                  <FileText size={20} className="sm:w-7 sm:h-7 text-gray-400" />
                  <FileSpreadsheet size={20} className="sm:w-7 sm:h-7 text-green-500" />
                  <Presentation size={20} className="sm:w-7 sm:h-7 text-orange-500" />
                </div>
                
                {isDragActive ? (
                  <p className="text-blue-600 font-medium text-sm sm:text-base">Drop the files here...</p>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    <p className="text-gray-600 font-medium mb-2 text-sm sm:text-base">
                      Drag & drop files or tap to select
                    </p>
                    <div className="hidden sm:block">
                      {renderFileTypeSupport()}
                    </div>
                    {/* Simplified mobile view */}
                    <div className="block sm:hidden">
                      <p className="text-xs text-gray-500">PDF, DOC, XLS, PPT, Images</p>
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      Max: {fileSizeText} • {maxFiles} files
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      ✨ AI analysis for all formats!
                    </p>
                  </div>
                )}
                
                <Upload size={20} className="sm:w-6 sm:h-6 mx-auto text-gray-400" />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

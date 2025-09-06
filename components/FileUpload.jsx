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
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
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
      
      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const storagePath = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          onUploadProgress: (progress) => {
            setUploadProgress((progress.loaded / progress.total) * 40);
          }
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      setUploadProgress(50);

      // Extract text content
      const formData = new FormData();
      formData.append('file', file);

      const extractResponse = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });

      const extractResult = await extractResponse.json();
      const { extractedText, imageData, metadata, fileType } = extractResult;

      setUploadProgress(75);

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

      // Track file upload
      if (user && savedFile) {
        await usageTracker.trackFileUpload(user.id, savedFile.id);
      }

      // Success message
      const fileTypeMessages = {
        'spreadsheet': `Excel file "${file.name}" processed! ${metadata?.sheetCount || 0} sheets analyzed.`,
        'presentation': `PowerPoint "${file.name}" processed! ${metadata?.slideCount || 0} slides analyzed.`,
        'image': `Image "${file.name}" processed! OCR ${metadata?.hasOCR ? 'completed' : 'attempted'}.`,
        'pdf': `PDF "${file.name}" processed! ${metadata?.pages || 0} pages analyzed.`,
        'document': `Document "${file.name}" processed successfully!`
      };
      
      toast.success(fileTypeMessages[fileType] || `File "${file.name}" uploaded successfully!`);
      
      return savedFile;

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload "${file.name}"`);
      return null;
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles.length) return;

    // Check file count limit
    if (acceptedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed. Only first ${maxFiles} files will be processed.`);
      acceptedFiles = acceptedFiles.slice(0, maxFiles);
    }

    setUploading(true);
    setUploadProgress(0);

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
          const result = await processFile(file);
          if (result) {
            results.push(result);
          }
          
          // Update overall progress
          setUploadProgress(((i + 1) / acceptedFiles.length) * 100);
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
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp']
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    multiple: !inChat && maxFiles > 1, // Allow multiple files based on maxFiles
    disabled: uploading,
    maxSize: maxFileSize
  });

  const renderFileTypeSupport = () => {
    return (
      <div className="text-sm text-gray-500 space-y-1">
        <p>📄 Documents: PDF, DOC, DOCX</p>
        <p>📊 Spreadsheets: XLS, XLSX</p>
        <p>📊 Presentations: PPT, PPTX</p>
        <p>🖼️ Images: JPG, PNG, GIF, WebP</p>
      </div>
    );
  };

  const containerClass = inChat 
    ? "w-full" 
    : "w-full max-w-md mx-auto";

  const dropzoneClass = inChat
    ? `border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
       ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
       ${uploading ? 'pointer-events-none opacity-50' : ''}`
    : `border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
       ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
       ${uploading ? 'pointer-events-none opacity-50' : ''}`;

  const fileSizeText = `${Math.round(maxFileSize / 1024 / 1024)}MB`;

  return (
    <div className={containerClass}>
      <div className={dropzoneClass} {...getRootProps()}>
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="space-y-4">
            <Loader2 size={inChat ? 32 : 48} className="mx-auto text-blue-500 animate-spin" />
            <div>
              <p className="text-gray-600 mb-2">
                {currentUpload ? `Uploading ${currentUpload}...` : 'Processing...'}
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
          <div className={`space-y-${inChat ? '2' : '4'}`}>
            {inChat ? (
              <div className="flex items-center justify-center gap-2">
                <Plus size={20} className="text-gray-400" />
                <span className="text-gray-600 text-sm">Add another file</span>
              </div>
            ) : (
              <>
                <div className="flex justify-center space-x-2">
                  <FileText size={28} className="text-gray-400" />
                  <FileSpreadsheet size={28} className="text-green-500" />
                  <Presentation size={28} className="text-orange-500" />
                  <Image size={28} className="text-blue-400" />
                </div>
                
                {isDragActive ? (
                  <p className="text-blue-600 font-medium">Drop the files here...</p>
                ) : (
                  <div>
                    <p className="text-gray-600 font-medium mb-2">
                      Drag & drop files here, or click to select
                    </p>
                    {renderFileTypeSupport()}
                    <div className="text-xs text-gray-400 mt-2">
                      Max file size: {fileSizeText} • Maximum {maxFiles} files
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      ✨ Advanced AI analysis for all formats!
                    </p>
                  </div>
                )}
                
                <Upload size={24} className="mx-auto text-gray-400" />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

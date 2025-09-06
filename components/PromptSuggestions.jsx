import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Lightbulb, ChevronRight, X } from 'lucide-react';

export default function PromptSuggestions({ fileId, onSelectSuggestion }) {
  const supabase = useSupabaseClient();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (fileId) {
      generateSuggestions();
      setIsVisible(true);
    }
  }, [fileId]);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      // Fetch file info to determine type
      const { data: file, error } = await supabase
        .from('files')
        .select('file_type, original_name')
        .eq('id', fileId)
        .single();

      if (error) {
        console.error('Error fetching file:', error);
        return;
      }

      if (file) {
        // Try API first
        try {
          const response = await fetch('/api/suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileType: file.file_type,
              fileName: file.original_name
            })
          });

          if (response.ok) {
            const data = await response.json();
            setSuggestions(data.suggestions || []);
          } else {
            throw new Error('API response not ok');
          }
        } catch (apiError) {
          console.error('API error, falling back to client-side:', apiError);
          generateClientSideSuggestions(file);
        }
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateClientSideSuggestions = (file) => {
    const fileType = file.file_type;
    const fileName = file.original_name;
    
    let suggestions = [];

    // Check if it's an image file
    const isImage = fileType?.startsWith('image/') || 
                   ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].some(ext => 
                     fileName?.toLowerCase().endsWith(`.${ext}`)
                   );

    const isPdf = fileType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf');
    
    const isDoc = fileType?.includes('wordprocessing') || 
                  fileType === 'application/msword' ||
                  fileName?.toLowerCase().endsWith('.docx') ||
                  fileName?.toLowerCase().endsWith('.doc');

    if (isImage) {
      suggestions = [
        'What do you see in this image?',
        'Describe the main elements and details',
        'Extract and explain any text in the image',
        'What insights can you provide about this image?'
      ];
    } else if (isPdf) {
      suggestions = [
        'Summarize the main points of this document',
        'What are the key takeaways?',
        'Extract important data or statistics',
        'Explain complex concepts in simple terms'
      ];
    } else if (isDoc) {
      suggestions = [
        'Summarize this document',
        'What are the main arguments presented?',
        'Extract key quotes or important sections',
        'Analyze the document structure'
      ];
    } else {
      suggestions = [
        'Tell me about this file',
        'What are the main topics covered?',
        'Provide a summary',
        'What questions should I ask about this content?'
      ];
    }

    setSuggestions(suggestions);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleSuggestionClick = (suggestion) => {
    onSelectSuggestion(suggestion);
    setIsVisible(false);
  };

  if (!isVisible || loading || suggestions.length === 0) return null;

  return (
    <div className="border-t border-gray-200 p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-amber-500" />
          <span className="text-sm font-medium text-gray-700">Suggested prompts</span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          title="Close suggestions"
        >
          <X size={14} className="text-gray-400 hover:text-gray-600" />
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {suggestions.slice(0, 4).map((suggestion, index) => (
          <button
            key={index}
            onClick={() => handleSuggestionClick(suggestion)}
            className="group flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all text-sm text-gray-700"
          >
            <span>{suggestion}</span>
            <ChevronRight size={12} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
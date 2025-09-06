import gemini from '../../lib/gemini';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { fileType, fileName } = req.body;
    
    // Determine if it's an image by checking both MIME type and file extension
    const isImage = fileType?.startsWith('image/') || 
                   ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].some(ext => 
                     fileName?.toLowerCase().endsWith(`.${ext}`)
                   );

    const isPdf = fileType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf');
    
    const isDoc = fileType?.includes('wordprocessing') || 
                  fileType === 'application/msword' ||
                  fileName?.toLowerCase().endsWith('.docx') ||
                  fileName?.toLowerCase().endsWith('.doc');

    let suggestionType = 'default';
    
    if (isImage) {
      suggestionType = 'image';
    } else if (isPdf) {
      suggestionType = 'pdf';
    } else if (isDoc) {
      suggestionType = 'docx';
    }

    const suggestions = await gemini.generateSuggestions(suggestionType, fileName);
        
    res.status(200).json({ suggestions });
  } catch (error) {
    console.error('Suggestions API error:', error);
    
    // Fallback suggestions
    const fallbackSuggestions = [
      'Tell me about this file',
      'What are the main topics covered?',
      'Provide a summary',
      'What questions should I ask about this content?'
    ];
    
    res.status(200).json({ suggestions: fallbackSuggestions });
  }
}
import axios from 'axios';

class DeepSeekClient {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.baseURL = 'https://api.deepseek.com/v1';
  }

  async generateResponse(messages, fileContext = null) {
    try {
      const systemMessage = {
        role: 'system',
        content: `You are FileMentor, an AI assistant that helps users understand and analyze documents. 
        ${fileContext ? `Context from uploaded file: ${fileContext.substring(0, 2000)}...` : ''}
        Provide helpful, accurate, and contextual responses based on the document content.`
      };

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: [systemMessage, ...messages],
          max_tokens: 1000,
          temperature: 0.7,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('DeepSeek API Error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async generateSuggestions(fileType, fileName) {
    const suggestions = {
      'pdf': [
        'Summarize the main points of this document',
        'What are the key takeaways?',
        'Extract important data or statistics',
        'Explain complex concepts in simple terms'
      ],
      'image': [
        'Describe what you see in this image',
        'Extract any text from this image',
        'Analyze the visual elements',
        'What insights can you provide about this image?'
      ],
      'docx': [
        'Summarize this document',
        'What are the main arguments presented?',
        'Extract key quotes or important sections',
        'Analyze the document structure'
      ],
      'default': [
        'Tell me about this file',
        'What are the main topics covered?',
        'Provide a summary',
        'What questions should I ask about this content?'
      ]
    };

    return suggestions[fileType] || suggestions['default'];
  }
}

export default new DeepSeekClient();
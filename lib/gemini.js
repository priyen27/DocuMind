import { GoogleGenerativeAI } from "@google/generative-ai";

class GeminiClient {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.textModel = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    this.visionModel = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async generateResponse(messages, fileContext = null, imageData = null, metadata = null) {
    try {
      const lastMessage = messages[messages.length - 1];
      
      // Handle image-based queries
      if (imageData && imageData.data) {
        return await this.generateImageResponse(lastMessage.content, imageData, fileContext, metadata);
      }
      
      // Handle text-based queries with enhanced context
      return await this.generateTextResponse(messages, fileContext, metadata);
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw new Error("Failed to generate AI response");
    }
  }

  async generateImageResponse(userQuery, imageData, extractedText = null, metadata = null) {
    try {
      const systemPrompt = `You are FileMentor, an AI assistant specialized in analyzing images and documents. 
      You can see and analyze images directly. Provide helpful, detailed responses about what you observe.
      
      ${extractedText && extractedText !== '[No readable text found in image]' 
        ? `OCR extracted this text from the image: "${extractedText}"` 
        : 'No readable text was found in this image through OCR.'
      }
      
      ${metadata ? `Additional metadata: ${JSON.stringify(metadata)}` : ''}
      
      Answer the user's question about the image. Be descriptive and helpful. If there's text in the image, help interpret and analyze it.`;

      const imagePart = {
        inlineData: {
          data: imageData.data,
          mimeType: imageData.mimeType
        }
      };

      const prompt = `${systemPrompt}\n\nUser question: ${userQuery}`;
      
      const result = await this.visionModel.generateContent([prompt, imagePart]);
      return result.response.text();
      
    } catch (error) {
      console.error("Vision model error:", error);
      throw new Error("Failed to analyze image");
    }
  }

  async generateTextResponse(messages, fileContext, metadata = null) {
    let systemMessage = `You are FileMentor, an AI assistant that helps users understand and analyze documents, spreadsheets, presentations, and images.`;
    
    // Enhanced context based on file type
    if (metadata) {
      const fileType = metadata.type;
      
      switch (fileType) {
        case 'spreadsheet':
          systemMessage += `\n\nYou are analyzing an Excel spreadsheet with ${metadata.sheetCount || 0} sheets. You can help with:
          - Data analysis and insights
          - Chart and graph suggestions
          - Formula explanations
          - Data visualization recommendations
          - Statistical analysis of the data
          - Identifying trends and patterns`;
          break;
          
        case 'presentation':
          systemMessage += `\n\nYou are analyzing a PowerPoint presentation with ${metadata.slideCount || 0} slides. You can help with:
          - Summarizing presentation content
          - Analyzing slide structure and flow
          - Suggesting improvements to presentations
          - Extracting key points and themes
          - Understanding the presentation's narrative`;
          break;
          
        case 'pdf':
          systemMessage += `\n\nYou are analyzing a PDF document with ${metadata.pages || 0} pages. You can help with:
          - Document summarization
          - Key point extraction
          - Content analysis
          - Question answering about the content`;
          break;
          
        case 'document':
          systemMessage += `\n\nYou are analyzing a Word document. You can help with:
          - Content analysis and summarization
          - Writing improvement suggestions
          - Structure analysis
          - Key information extraction`;
          break;
          
        case 'image':
          systemMessage += `\n\nYou are analyzing an image file. You can help with:
          - Describing visual content
          - Reading and interpreting text in images
          - Analyzing charts, diagrams, or infographics
          - Identifying objects and scenes`;
          break;
      }
    }
    
    if (fileContext) {
      systemMessage += `\n\nContent from the uploaded file:\n${fileContext.substring(0, 3000)}...`;
    }
    
    systemMessage += `\n\nProvide helpful, accurate, and contextual responses based on the document content. Use formatting like bullet points, numbered lists, and headers when appropriate to make your responses clear and readable.`;

    // Convert messages into plain conversation text
    const prompt = [
      systemMessage,
      ...messages.map(m => `${m.role}: ${m.content}`)
    ].join("\n");

    const result = await this.textModel.generateContent(prompt);
    return result.response.text();
  }

  async generateSuggestions(suggestionType, fileName, metadata = null) {    
    const suggestions = {
      'pdf': [
        'Summarize the main points of this document',
        'What are the key takeaways?',
        'Extract important data or statistics',
        'Explain complex concepts in simple terms',
        'Create an outline of the document structure'
      ],
      'image': [
        'What do you see in this image?',
        'Describe the main elements and details',
        'Extract and explain any text in the image',
        'What insights can you provide about this image?',
        'Analyze the visual composition and style'
      ],
      'docx': [
        'Summarize this document',
        'What are the main arguments presented?',
        'Extract key quotes or important sections',
        'Analyze the document structure',
        'Identify the main themes and topics'
      ],
      'spreadsheet': [
        'What data is contained in this spreadsheet?',
        'Analyze the trends and patterns in the data',
        'What are the key statistics and insights?',
        'Suggest charts or visualizations for this data',
        'Explain the relationships between different data columns',
        'What business insights can be drawn from this data?'
      ],
      'presentation': [
        'Summarize the main points of this presentation',
        'What is the key message or theme?',
        'Analyze the presentation structure and flow',
        'Extract key takeaways from each slide',
        'What are the main conclusions or recommendations?',
        'Suggest improvements for this presentation'
      ],
      'default': [
        'Tell me about this file',
        'What are the main topics covered?',
        'Provide a summary',
        'What questions should I ask about this content?'
      ]
    };

    // Enhanced suggestions based on metadata
    if (metadata) {
      switch (metadata.type) {
        case 'spreadsheet':
          if (metadata.sheetCount > 1) {
            suggestions.spreadsheet.push('Compare data across different sheets');
          }
          break;
        case 'presentation':
          if (metadata.slideCount > 10) {
            suggestions.presentation.push('Break down this presentation by sections');
          }
          break;
      }
    }

    const result = suggestions[suggestionType] || suggestions['default'];
    return result;
  }

  // New method for advanced analytics
  async generateAnalytics(fileData, analysisType = 'summary') {
    try {
      const { content, metadata, fileType } = fileData;
      
      let prompt = `Analyze the following ${fileType} content and provide a ${analysisType} analysis:\n\n${content}`;
      
      switch (analysisType) {
        case 'insights':
          prompt += '\n\nFocus on key insights, trends, and important findings.';
          break;
        case 'summary':
          prompt += '\n\nProvide a comprehensive summary of the main points.';
          break;
        case 'questions':
          prompt += '\n\nGenerate thoughtful questions that could be asked about this content.';
          break;
        case 'action_items':
          prompt += '\n\nIdentify actionable items, tasks, or recommendations from this content.';
          break;
      }
      
      const result = await this.textModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Analytics generation error:', error);
      throw new Error('Failed to generate analytics');
    }
  }
}

export default new GeminiClient();
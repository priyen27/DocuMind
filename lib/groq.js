// lib/groq.js
import Groq from "groq-sdk";

class GroqClient {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.client = new Groq({ apiKey: this.apiKey });
  }

  async generateResponse(messages, fileContext = null, imageData = null, metadata = null) {
    try {
      // Note: Groq doesn't support images yet, handle text only
      if (imageData && imageData.data) {
        return "Image analysis is not supported with Groq. Please use text-based queries.";
      }
      
      return await this.generateTextResponse(messages, fileContext, metadata);
    } catch (error) {
      console.error("Groq API Error:", error);
      throw new Error("Failed to generate AI response");
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
      }
    }
    
    if (fileContext) {
      systemMessage += `\n\nContent from the uploaded file:\n${fileContext.substring(0, 3000)}...`;
    }
    
    systemMessage += `\n\nProvide helpful, accurate, and contextual responses based on the document content. Use formatting like bullet points, numbered lists, and headers when appropriate to make your responses clear and readable.`;

    // Format messages for Groq
    const formattedMessages = [
      { role: "system", content: systemMessage },
      ...messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }))
    ];

    const completion = await this.client.chat.completions.create({
      messages: formattedMessages,
      model: "llama-3.3-70b-versatile", // Latest fast and smart model
      temperature: 0.7,
      max_tokens: 2048,
    });

    return completion.choices[0]?.message?.content || "No response generated";
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

  async generateAnalytics(fileData, analysisType = 'summary') {
    try {
      const { content, metadata, fileType } = fileData;
      
      let userPrompt = `Analyze the following ${fileType} content and provide a ${analysisType} analysis:\n\n${content}`;
      
      switch (analysisType) {
        case 'insights':
          userPrompt += '\n\nFocus on key insights, trends, and important findings.';
          break;
        case 'summary':
          userPrompt += '\n\nProvide a comprehensive summary of the main points.';
          break;
        case 'questions':
          userPrompt += '\n\nGenerate thoughtful questions that could be asked about this content.';
          break;
        case 'action_items':
          userPrompt += '\n\nIdentify actionable items, tasks, or recommendations from this content.';
          break;
      }
      
      const completion = await this.client.chat.completions.create({
        messages: [
          { role: "system", content: "You are a helpful document analysis assistant." },
          { role: "user", content: userPrompt }
        ],
        model: "llama-3.1-70b-versatile",
        temperature: 0.7,
        max_tokens: 2048,
      });

      return completion.choices[0]?.message?.content || "No analysis generated";
    } catch (error) {
      console.error('Analytics generation error:', error);
      throw new Error('Failed to generate analytics');
    }
  }
}

export default new GroqClient();

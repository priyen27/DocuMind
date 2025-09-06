import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import gemini from '../../lib/gemini';
import { usageTracker } from '../../utils/usageTracker';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check user subscription tier first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_tier, daily_prompts_used, monthly_prompts_used')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return res.status(500).json({ message: 'Error fetching user data' });
    }

    // Restrict AI analysis to pro and legend users only
    const userTier = userData?.subscription_tier || 'free';
    if (userTier === 'free') {
      return res.status(403).json({ 
        message: 'AI Analysis is available for Pro and Legend users only',
        upgradeRequired: true,
        feature: 'ai_analysis',
        currentPlan: userTier
      });
    }

    const { fileId, analysisType, options = {} } = req.body;

    if (!fileId || !analysisType) {
      return res.status(400).json({ message: 'File ID and analysis type are required' });
    }

    // Validate analysis type
    const validAnalysisTypes = ['summary', 'insights', 'questions', 'action_items'];
    if (!validAnalysisTypes.includes(analysisType)) {
      return res.status(400).json({ message: 'Invalid analysis type' });
    }

    // Get file data and verify ownership
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', session.user.id)
      .single();

    if (fileError || !file) {
      return res.status(404).json({ message: 'File not found or access denied' });
    }

    if (!file.extracted_text || file.extracted_text.trim().length === 0) {
      return res.status(400).json({ message: 'File has no extracted text to analyze' });
    }

    // Check if analysis already exists (optional caching)
    const { data: existingAnalysis } = await supabase
      .from('file_analytics')
      .select('*')
      .eq('file_id', fileId)
      .eq('user_id', session.user.id)
      .eq('analysis_type', analysisType)
      .maybeSingle();

    // Return existing analysis if found and recent (within 24 hours)
    if (existingAnalysis && 
        new Date() - new Date(existingAnalysis.generated_at) < 24 * 60 * 60 * 1000) {
      return res.status(200).json({ 
        analysis: existingAnalysis.analysis_result,
        cached: true,
        generatedAt: existingAnalysis.generated_at
      });
    }

    // Generate new analysis
    let analysisResult;

    try {
      switch (analysisType) {
        case 'summary':
          analysisResult = await generateSummary(file, options);
          break;
        case 'insights':
          analysisResult = await generateInsights(file, options);
          break;
        case 'questions':
          analysisResult = await generateQuestions(file, options);
          break;
        case 'action_items':
          analysisResult = await generateActionItems(file, options);
          break;
        default:
          return res.status(400).json({ message: 'Invalid analysis type' });
      }
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      return res.status(500).json({ 
        message: 'Failed to generate analysis', 
        error: aiError.message 
      });
    }

    // Save analysis result to database
    try {
      const { data: savedAnalysis, error: saveError } = await supabase
        .from('file_analytics')
        .upsert({
          file_id: fileId,
          user_id: session.user.id,
          analysis_type: analysisType,
          analysis_result: analysisResult,
          generated_at: new Date().toISOString()
        }, {
          onConflict: 'file_id,user_id,analysis_type'
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving analysis:', saveError);
        // Continue anyway, don't fail the request
      }
    } catch (dbError) {
      console.error('Database save failed:', dbError);
      // Continue anyway, don't fail the request
    }

    // Track usage
    try {
      await usageTracker.trackAnalysis(session.user.id, fileId, analysisType);
    } catch (trackingError) {
      console.error('Usage tracking failed:', trackingError);
      // Don't fail the request for tracking errors
    }

    res.status(200).json({ 
      analysis: analysisResult,
      success: true,
      analysisType,
      fileId,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function generateSummary(file, options) {
  try {
    const { length = 'medium' } = options;
    
    // SAFE METADATA PARSING
    let metadata = {};
    try {
      metadata = file.metadata ? JSON.parse(file.metadata) : {};
    } catch (parseError) {
      console.warn('Could not parse file metadata:', parseError);
      metadata = {};
    }
    
    const lengthInstructions = {
      short: 'a brief 2-3 sentence',
      medium: 'a comprehensive 1-2 paragraph', 
      long: 'a detailed 3-4 paragraph'
    };
    
    let prompt = `Provide ${lengthInstructions[length] || lengthInstructions.medium} summary of the following ${getFileTypeLabel(file.file_type)} content:\n\n${file.extracted_text.substring(0, 3000)}`;
    
    if (metadata.type === 'spreadsheet') {
      prompt += `\n\nThis spreadsheet contains ${metadata.sheetCount || 'multiple'} sheet(s). Focus on the data structure, key metrics, trends, and important values.`;
    } else if (metadata.type === 'presentation') {
      prompt += `\n\nThis presentation contains ${metadata.slideCount || 'multiple'} slide(s). Focus on the main message, key points, conclusions, and actionable insights.`;
    }
    
    const result = await gemini.textModel.generateContent(prompt);
    
    return {
      summary: result.response.text(),
      wordCount: file.extracted_text.split(/\s+/).length,
      fileType: file.file_type,
      analysisDate: new Date().toISOString(),
      metadata: metadata
    };
  } catch (error) {
    console.error('Summary generation error:', error);
    throw new Error('Failed to generate summary: ' + error.message);
  }
}

async function generateInsights(file, options) {
  try {
    let metadata = {};
    try {
      metadata = file.metadata ? JSON.parse(file.metadata) : {};
    } catch (parseError) {
      metadata = {};
    }
    
    let prompt = `Analyze the following ${getFileTypeLabel(file.file_type)} and provide 5-7 key insights, trends, patterns, and important findings. Format as numbered list:\n\n${file.extracted_text.substring(0, 3000)}`;
    
    if (metadata.type === 'spreadsheet') {
      prompt += `\n\nFocus on data patterns, statistical insights, correlations, outliers, and business implications from the numerical data.`;
    } else if (metadata.type === 'presentation') {
      prompt += `\n\nFocus on strategic insights, key messages, recommendations, and actionable outcomes from the presentation content.`;
    }
    
    const result = await gemini.textModel.generateContent(prompt);
    
    return {
      insights: result.response.text(),
      fileType: file.file_type,
      analysisDate: new Date().toISOString(),
      metadata: metadata
    };
  } catch (error) {
    throw new Error('Failed to generate insights: ' + error.message);
  }
}

async function generateQuestions(file, options) {
  try {
    const { count = 8 } = options;
    
    let prompt = `Generate ${count} thoughtful, relevant, and diverse questions that someone might ask about this ${getFileTypeLabel(file.file_type)}. Include both clarifying and analytical questions:\n\n${file.extracted_text.substring(0, 2500)}`;
    
    const result = await gemini.textModel.generateContent(prompt);
    
    return {
      questions: result.response.text(),
      questionCount: count,
      fileType: file.file_type,
      analysisDate: new Date().toISOString()
    };
  } catch (error) {
    throw new Error('Failed to generate questions: ' + error.message);
  }
}

async function generateActionItems(file, options) {
  try {
    let prompt = `Extract and list all actionable items, tasks, recommendations, next steps, and to-dos from this ${getFileTypeLabel(file.file_type)}. Format as a clear numbered list:\n\n${file.extracted_text.substring(0, 3000)}`;
    
    const result = await gemini.textModel.generateContent(prompt);
    
    return {
      actionItems: result.response.text(),
      fileType: file.file_type,
      analysisDate: new Date().toISOString()
    };
  } catch (error) {
    throw new Error('Failed to generate action items: ' + error.message);
  }
}

// Helper function
function getFileTypeLabel(mimeType) {
  if (mimeType?.includes('spreadsheet') || mimeType === 'application/vnd.ms-excel') return 'spreadsheet';
  if (mimeType?.includes('presentation') || mimeType === 'application/vnd.ms-powerpoint') return 'presentation';
  if (mimeType === 'application/pdf') return 'PDF document';
  if (mimeType?.includes('wordprocessing') || mimeType?.includes('word')) return 'Word document';
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType?.includes('text/')) return 'text file';
  return 'document';
}
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import gemini from '../../lib/gemini';

// Create admin client with service role key (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

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

    const { message, sessionId, fileId, attachedFiles } = req.body;

    // Get user data for subscription limits
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_tier, daily_prompts_used')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
    }

    const subscriptionTier = userData?.subscription_tier || 'free';
    const dailyLimits = { free: 10, pro: 25, legend: 50 };
    const userLimit = dailyLimits[subscriptionTier];

    // Get current usage more reliably
    const today = new Date().toISOString().split('T')[0];
    
    // Check current daily usage
    const { data: currentUsage, error: usageError } = await supabase
      .from('daily_usage')
      .select('prompts_used')
      .eq('user_id', session.user.id)
      .eq('usage_date', today)
      .maybeSingle();

    const currentPromptsUsed = currentUsage?.prompts_used || 0;

    // Check if user has reached limit
    if (currentPromptsUsed >= userLimit) {
      return res.status(429).json({ 
        message: `Daily prompt limit exceeded (${currentPromptsUsed}/${userLimit})`,
        limit: userLimit,
        used: currentPromptsUsed,
        tier: subscriptionTier
      });
    }

    // SAVE USER MESSAGE TO DATABASE FIRST (using admin client)
    const userMessageTimestamp = new Date().toISOString();
    const { data: savedUserMessage, error: userMessageError } = await supabaseAdmin
      .from('messages')
      .insert({
        chat_session_id: sessionId,
        user_id: session.user.id,
        role: 'user',
        content: message,
        timestamp: userMessageTimestamp,
        tier_used: subscriptionTier,
        metadata: attachedFiles && attachedFiles.length > 1 ? { 
          attachedFiles: attachedFiles,
          fileCount: attachedFiles.length 
        } : null
      })
      .select()
      .single();

    if (userMessageError) {
      console.error('Error saving user message:', userMessageError);
      return res.status(500).json({ message: 'Failed to save user message' });
    }

    let fileContexts = [];
    let allImageData = [];
    let fileTypes = [];
    
    // Handle multiple files or single file
    const filesToProcess = attachedFiles && attachedFiles.length > 0 ? attachedFiles : (fileId ? [fileId] : []);
    
    if (filesToProcess.length > 0) {
      const { data: files } = await supabase
        .from('files')
        .select('id, original_name, extracted_text, file_type, image_data, metadata')
        .in('id', filesToProcess)
        .eq('user_id', session.user.id); // Security: ensure user owns files
      
      if (files && files.length > 0) {
        files.forEach(file => {
          // Add text content
          if (file.extracted_text) {
            fileContexts.push({
              filename: file.original_name,
              content: file.extracted_text,
              type: file.file_type
            });
          }
          
          fileTypes.push(file.file_type);
          
          // Add image data if it's an image file
          if (file.file_type?.startsWith('image/') && file.image_data) {
            try {
              const imageData = JSON.parse(file.image_data);
              allImageData.push({
                filename: file.original_name,
                ...imageData
              });
            } catch (e) {
              console.error('Error parsing image data:', e);
            }
          }
          
          // Add metadata context for structured files
          if (file.metadata) {
            try {
              const metadata = 
                  typeof file.metadata === 'string' 
                    ? JSON.parse(file.metadata) 
                    : file.metadata;
              if (metadata.sheetNames || metadata.slideCount || metadata.pages) {
                fileContexts.push({
                  filename: `${file.original_name} (metadata)`,
                  content: `File structure: ${JSON.stringify(metadata, null, 2)}`,
                  type: 'metadata'
                });
              }
            } catch (e) {
              console.error('Error parsing metadata:', e);
            }
          }
        });
      }
    }

    // Get conversation history (using regular client since we're just reading)
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('chat_session_id', sessionId)
      .neq('id', savedUserMessage.id) // Exclude the message we just saved
      .order('timestamp', { ascending: true });

    const conversationHistory = messages || [];
    conversationHistory.push({ role: 'user', content: message });

    // Prepare context for AI
    let combinedContext = null;
    if (fileContexts.length > 0) {
      if (fileContexts.length === 1) {
        combinedContext = fileContexts[0].content;
      } else {
        // Multiple files - create combined context
        combinedContext = fileContexts.map(file => 
          `=== ${file.filename} ===\n${file.content}\n`
        ).join('\n\n');
      }
    }

    // Generate AI response with multi-file support
    const aiResponse = await gemini.generateResponse(
      conversationHistory, 
      combinedContext, 
      allImageData.length > 0 ? allImageData : null,
      {
        fileCount: filesToProcess.length,
        fileTypes: fileTypes,
        isMultiFile: filesToProcess.length > 1
      }
    );

    // SAVE AI MESSAGE TO DATABASE (using admin client)
    const aiMessageTimestamp = new Date().toISOString();
    const { data: savedAiMessage, error: aiError } = await supabaseAdmin
      .from('messages')
      .insert({
        chat_session_id: sessionId,
        user_id: session.user.id,
        role: 'assistant',
        content: aiResponse,
        timestamp: aiMessageTimestamp,
        tier_used: subscriptionTier
      })
      .select()
      .single();

    if (aiError) {
      console.error('Error saving AI message:', aiError);
      return res.status(500).json({ message: 'Failed to save AI response' });
    }

    // 🔥 NEW: Send notification for file analysis completion (if files were processed)
    // if (fileContexts.length > 0) {
    //   try {
    //     await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/notifications/send`, {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({
    //         userId: session.user.id,
    //         emailType: 'analysisComplete',
    //         data: {
    //           fileCount: filesToProcess.length,
    //           fileNames: fileContexts.map(f => f.filename).join(', ')
    //         }
    //       })
    //     });
    //   } catch (notificationError) {
    //     console.error('Error sending analysis notification:', notificationError);
    //     // Don't fail the main request if notification fails
    //   }
    // }

    // Update daily usage using UPSERT to handle concurrent requests better
    const { error: dailyUsageError } = await supabaseAdmin
      .from('daily_usage')
      .upsert({
        user_id: session.user.id,
        usage_date: today,
        prompts_used: currentPromptsUsed + 1,
        tier_at_time: subscriptionTier
      }, {
        onConflict: 'user_id,usage_date',
        ignoreDuplicates: false
      });

    if (dailyUsageError) {
      console.error('Error updating daily usage:', dailyUsageError);
      // Continue anyway - usage tracking shouldn't block the response
    }

    // Update user's daily usage counter (using admin client)
    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update({ 
        daily_prompts_used: (userData?.daily_prompts_used || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id);

    if (userUpdateError) {
      console.error('Error updating user daily usage:', userUpdateError);
      // Continue anyway
    }

    // Update session timestamp (using admin client)
    const { error: sessionUpdateError } = await supabaseAdmin
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (sessionUpdateError) {
      console.error('Error updating session timestamp:', sessionUpdateError);
      // Continue anyway
    }

    // Track feature usage for multi-file sessions
    if (filesToProcess.length > 1) {
      await supabaseAdmin
        .from('feature_usage')
        .upsert({
          user_id: session.user.id,
          feature_name: 'multi_file_chat',
          tier_required: 'pro',
          usage_date: today,
          usage_count: 1,
          metadata: { fileCount: filesToProcess.length }
        }, {
          onConflict: 'user_id,feature_name,usage_date'
        });
    }

    console.log(`Usage updated for user ${session.user.id}: ${currentPromptsUsed + 1}/${userLimit}`);

    // Return both saved messages for client to update UI
    res.status(200).json({ 
      response: aiResponse,
      userMessage: savedUserMessage,
      aiMessage: savedAiMessage,
      usage: {
        used: currentPromptsUsed + 1,
        limit: userLimit,
        tier: subscriptionTier
      }
    });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const createSupabaseClient = () => createClientComponentClient()

// Database Schema SQL
export const DATABASE_SCHEMA = `
-- Users table
-- Enhanced Database Schema for FileMentor v2.0

-- Users table (enhanced)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  subscription_tier VARCHAR(20) DEFAULT 'free', -- free, pro, legend
  subscription_status VARCHAR(20) DEFAULT 'active', -- active, canceled, past_due, unpaid, pending
  
  -- Razorpay fields (replacing Stripe fields)
  razorpay_customer_id VARCHAR(255) UNIQUE,
  razorpay_subscription_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255), -- Latest payment ID
  razorpay_order_id VARCHAR(255), -- Latest order ID
  
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  daily_prompts_used INTEGER DEFAULT 0,
  monthly_prompts_used INTEGER DEFAULT 0,
  last_prompt_date DATE DEFAULT CURRENT_DATE,
  preferences JSONB DEFAULT '{}',
  billing_address JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription history table (updated for Razorpay)
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscription_tier VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  razorpay_subscription_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  amount_paid DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'INR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment transactions table (updated for Razorpay)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  razorpay_payment_id VARCHAR(255),
  razorpay_order_id VARCHAR(255),
  razorpay_subscription_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(20) NOT NULL, -- succeeded, failed, pending, canceled
  payment_method VARCHAR(50),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking with enhanced features
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  usage_date DATE DEFAULT CURRENT_DATE,
  prompts_used INTEGER DEFAULT 0,
  files_uploaded INTEGER DEFAULT 0,
  analysis_generated INTEGER DEFAULT 0,
  multi_file_comparisons INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  storage_used_mb DECIMAL(10,2) DEFAULT 0,
  features_used JSONB DEFAULT '{}',
  tier_at_time VARCHAR(20) DEFAULT 'free',
  UNIQUE(user_id, usage_date)
);

-- Enhanced files table
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT,
  extracted_text TEXT,
  metadata JSONB,
  image_data JSONB,
  processing_status VARCHAR(20) DEFAULT 'completed',
  ai_analysis JSONB, -- Store AI-generated insights
  analysis_tier VARCHAR(20) DEFAULT 'free', -- Track which tier was used for analysis
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT FALSE,
  shared_publicly BOOLEAN DEFAULT FALSE,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collections/Folders for file organization
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for files in collections
CREATE TABLE IF NOT EXISTS collection_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collection_id, file_id)
);

-- Enhanced chat sessions with tier tracking
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_name VARCHAR(255) NOT NULL,
  session_type VARCHAR(20) DEFAULT 'single', -- single, multi, comparison
  tier_used VARCHAR(20) DEFAULT 'free', -- Track tier used for session
  is_shared BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(255) UNIQUE,
  session_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for files in chat sessions
CREATE TABLE IF NOT EXISTS session_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, file_id)
);

-- Enhanced messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  tier_used VARCHAR(20) DEFAULT 'free',
  tokens_used INTEGER DEFAULT 0,
  processing_time_ms INTEGER DEFAULT 0,
  metadata JSONB,
  is_pinned BOOLEAN DEFAULT FALSE,
  rating INTEGER CHECK (rating IN (1, 2, 3, 4, 5)),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments and annotations (Pro/Legend feature)
CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  annotation_type VARCHAR(20) NOT NULL,
  content TEXT,
  position_data JSONB,
  color VARCHAR(7) DEFAULT '#FBBF24',
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics and insights with tier tracking
CREATE TABLE IF NOT EXISTS file_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  analysis_type VARCHAR(30) NOT NULL,
  analysis_result JSONB NOT NULL,
  tier_used VARCHAR(20) DEFAULT 'free',
  confidence_score DECIMAL(3,2), -- AI confidence in analysis
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Multi-file comparisons (Pro/Legend feature)
CREATE TABLE IF NOT EXISTS file_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  comparison_name VARCHAR(255) NOT NULL,
  file_ids UUID[] NOT NULL,
  comparison_type VARCHAR(30) NOT NULL, -- content, structure, data, etc.
  comparison_result JSONB NOT NULL,
  tier_used VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team workspaces (Legend feature)
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscription_tier VARCHAR(20) DEFAULT 'legend',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspace members
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- API keys and integrations (Legend feature)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key_name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  permissions JSONB DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature usage analytics
CREATE TABLE IF NOT EXISTS feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  feature_name VARCHAR(50) NOT NULL,
  tier_required VARCHAR(20) NOT NULL,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usage_date DATE DEFAULT CURRENT_DATE,
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, feature_name, usage_date)
);

-- Subscription limits and quotas
CREATE TABLE IF NOT EXISTS subscription_limits (
  tier VARCHAR(20) PRIMARY KEY,
  daily_prompts INTEGER NOT NULL,
  max_file_size_mb INTEGER NOT NULL,
  max_files_per_session INTEGER DEFAULT 1,
  api_calls_per_month INTEGER DEFAULT 0,
  storage_limit_gb DECIMAL(10,2) DEFAULT 1.0,
  features JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default subscription limits
INSERT INTO subscription_limits (tier, daily_prompts, max_file_size_mb, max_files_per_session, api_calls_per_month, storage_limit_gb, features) VALUES
('free', 10, 10, 1, 0, 1.0, '{"basic_analysis": true, "chat": true, "file_upload": true}'),
('pro', 25, 25, 5, 0, 5.0, '{"basic_analysis": true, "advanced_analysis": true, "chat": true, "file_upload": true, "multi_file": true, "annotations": true, "export": false}'),
('legend', 50, 50, 10, 1000, 25.0, '{"basic_analysis": true, "advanced_analysis": true, "premium_analysis": true, "chat": true, "file_upload": true, "multi_file": true, "annotations": true, "export": true, "api_access": true, "workspaces": true}')
ON CONFLICT (tier) DO UPDATE SET
  daily_prompts = EXCLUDED.daily_prompts,
  max_file_size_mb = EXCLUDED.max_file_size_mb,
  max_files_per_session = EXCLUDED.max_files_per_session,
  api_calls_per_month = EXCLUDED.api_calls_per_month,
  storage_limit_gb = EXCLUDED.storage_limit_gb,
  features = EXCLUDED.features,
  updated_at = NOW();

-- Daily usage table for better usage tracking
CREATE TABLE IF NOT EXISTS daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  usage_date DATE DEFAULT CURRENT_DATE,
  prompts_used INTEGER DEFAULT 0,
  files_uploaded INTEGER DEFAULT 0,
  analysis_generated INTEGER DEFAULT 0,
  tier_at_time VARCHAR(20) DEFAULT 'free',
  UNIQUE(user_id, usage_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_razorpay_customer_id ON users(razorpay_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_razorpay_payment_id ON payment_transactions(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON usage_tracking(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON daily_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_file_type ON files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_analysis_tier ON files(analysis_tier);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_messages_tier_used ON messages(tier_used);
CREATE INDEX IF NOT EXISTS idx_file_analytics_user_id ON file_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_file_comparisons_user_id ON file_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_date ON feature_usage(user_id, usage_date);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can view own subscription history" ON subscription_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own payment transactions" ON payment_transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own usage tracking" ON usage_tracking FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own daily usage" ON daily_usage FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own files" ON files FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own collections" ON collections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own collection files" ON collection_files FOR ALL USING (
  EXISTS (SELECT 1 FROM collections WHERE collections.id = collection_files.collection_id AND collections.user_id = auth.uid())
);
CREATE POLICY "Users can manage own chat sessions" ON chat_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view shared sessions" ON chat_sessions FOR SELECT USING (is_shared = true);
CREATE POLICY "Users can manage own session files" ON session_files FOR ALL USING (
  EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = session_files.session_id AND chat_sessions.user_id = auth.uid())
);
CREATE POLICY "Users can manage own messages" ON messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own annotations" ON annotations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own analytics" ON file_analytics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own file comparisons" ON file_comparisons FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own workspaces" ON workspaces FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Members can view workspace" ON workspaces FOR SELECT USING (
  EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = workspaces.id AND workspace_members.user_id = auth.uid())
);
CREATE POLICY "Workspace owners can manage members" ON workspace_members FOR ALL USING (
  EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = workspace_members.workspace_id AND workspaces.owner_id = auth.uid())
);
CREATE POLICY "Users can manage own API keys" ON api_keys FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own feature usage" ON feature_usage FOR ALL USING (auth.uid() = user_id);

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ language 'plpgsql';

-- Reset daily usage function
CREATE OR REPLACE FUNCTION reset_daily_usage()
RETURNS void AS $
BEGIN
    UPDATE users SET daily_prompts_used = 0 WHERE last_prompt_date < CURRENT_DATE;
    UPDATE users SET last_prompt_date = CURRENT_DATE WHERE last_prompt_date < CURRENT_DATE;
END;
$ LANGUAGE plpgsql;

-- Check subscription limits function
CREATE OR REPLACE FUNCTION check_user_limits(user_id UUID, feature_name TEXT)
RETURNS BOOLEAN AS $
DECLARE
    user_tier TEXT;
    feature_allowed BOOLEAN;
    daily_used INTEGER;
    daily_limit INTEGER;
BEGIN
    -- Get user tier and current usage
    SELECT subscription_tier, daily_prompts_used INTO user_tier, daily_used
    FROM users WHERE id = user_id;
    
    -- Get limits for user tier
    SELECT (features->feature_name)::boolean, daily_prompts INTO feature_allowed, daily_limit
    FROM subscription_limits WHERE tier = user_tier;
    
    -- Check if feature is allowed and within limits
    IF NOT feature_allowed THEN
        RETURN FALSE;
    END IF;
    
    IF feature_name = 'prompt' AND daily_used >= daily_limit THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$ LANGUAGE plpgsql;

-- Function to increment daily usage (for UsageTracker)
CREATE OR REPLACE FUNCTION increment_daily_usage(
    p_user_id UUID,
    p_usage_date DATE,
    p_field TEXT,
    p_increment INTEGER DEFAULT 1
)
RETURNS void AS $
BEGIN
    -- Insert or update daily usage
    INSERT INTO daily_usage (user_id, usage_date, prompts_used, files_uploaded, analysis_generated)
    VALUES (
        p_user_id,
        p_usage_date,
        CASE WHEN p_field = 'prompts_used' THEN p_increment ELSE 0 END,
        CASE WHEN p_field = 'files_uploaded' THEN p_increment ELSE 0 END,
        CASE WHEN p_field = 'analysis_generated' THEN p_increment ELSE 0 END
    )
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET
        prompts_used = daily_usage.prompts_used + CASE WHEN p_field = 'prompts_used' THEN p_increment ELSE 0 END,
        files_uploaded = daily_usage.files_uploaded + CASE WHEN p_field = 'files_uploaded' THEN p_increment ELSE 0 END,
        analysis_generated = daily_usage.analysis_generated + CASE WHEN p_field = 'analysis_generated' THEN p_increment ELSE 0 END;
END;
$ LANGUAGE plpgsql;

-- Function to increment user usage (legacy fields)
CREATE OR REPLACE FUNCTION increment_user_usage(
    p_user_id UUID,
    p_date DATE
)
RETURNS void AS $
DECLARE
    user_last_date DATE;
    is_same_month BOOLEAN;
BEGIN
    -- Get user's last prompt date
    SELECT last_prompt_date INTO user_last_date
    FROM users WHERE id = p_user_id;
    
    -- Check if it's the same month
    is_same_month := EXTRACT(YEAR FROM user_last_date) = EXTRACT(YEAR FROM p_date) 
                     AND EXTRACT(MONTH FROM user_last_date) = EXTRACT(MONTH FROM p_date);
    
    -- Update user usage
    UPDATE users SET
        daily_prompts_used = CASE 
            WHEN last_prompt_date = p_date THEN daily_prompts_used + 1
            ELSE 1
        END,
        monthly_prompts_used = CASE 
            WHEN is_same_month THEN monthly_prompts_used + 1
            ELSE 1
        END,
        last_prompt_date = p_date,
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_limits_updated_at BEFORE UPDATE ON subscription_limits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;
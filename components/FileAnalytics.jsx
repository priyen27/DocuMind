import { useState, useEffect } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { 
  Crown, 
  Sparkles, 
  FileText, 
  Lightbulb, 
  HelpCircle, 
  CheckSquare,
  Loader2,
  RefreshCw,
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const FileAnalytics = ({ 
  fileId, 
  userPlan = 'free', 
  onAnalysisGenerated, 
  onUpgradeClick 
}) => {
  const user = useUser();
  const supabase = useSupabaseClient();
  
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState({});
  const [loadingType, setLoadingType] = useState(null);
  const [existingAnalyses, setExistingAnalyses] = useState({});

  // Fetch existing analyses on component mount
  useEffect(() => {
    if (fileId && userPlan !== 'free') {
      fetchExistingAnalyses();
    }
  }, [fileId, userPlan]);

  const fetchExistingAnalyses = async () => {
    try {
      const { data: existingData, error } = await supabase
        .from('file_analytics')
        .select('*')
        .eq('file_id', fileId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error fetching existing analyses:', error);
        return;
      }

      if (existingData && existingData.length > 0) {
        const existingMap = {};
        existingData.forEach(item => {
          existingMap[item.analysis_type] = {
            ...item.analysis_result,
            generatedAt: item.generated_at,
            cached: true
          };
        });
        setExistingAnalyses(existingMap);
        setAnalyses(existingMap);
      }
    } catch (error) {
      console.error('Error fetching analyses:', error);
    }
  };

  const generateAnalysis = async (type, options = {}) => {
    if (userPlan === 'free') {
      onUpgradeClick?.();
      return;
    }

    setLoading(true);
    setLoadingType(type);
    
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          analysisType: type,
          options
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.upgradeRequired) {
          toast.error('AI Analysis requires Pro or Legend plan');
          onUpgradeClick?.();
          return;
        }
        throw new Error(data.message || 'Failed to generate analysis');
      }

      setAnalyses(prev => ({
        ...prev,
        [type]: {
          ...data.analysis,
          generatedAt: data.generatedAt,
          cached: data.cached || false
        }
      }));

      onAnalysisGenerated?.(type, data.analysis);
      
      if (data.cached) {
        toast.success('Analysis loaded from cache');
      } else {
        toast.success('Analysis generated successfully');
      }

    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Failed to generate analysis');
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  const refreshAnalysis = async (type) => {
    // Clear existing analysis and regenerate
    setAnalyses(prev => {
      const updated = { ...prev };
      delete updated[type];
      return updated;
    });
    
    await generateAnalysis(type);
  };

  const analysisTypes = [
    { 
      key: 'summary', 
      label: 'Summary', 
      icon: FileText, 
      color: 'blue',
      description: 'Get a concise overview of the document'
    },
    { 
      key: 'insights', 
      label: 'Key Insights', 
      icon: Lightbulb, 
      color: 'yellow',
      description: 'Discover important patterns and findings'
    },
    { 
      key: 'questions', 
      label: 'Questions', 
      icon: HelpCircle, 
      color: 'purple',
      description: 'Generate relevant questions about the content'
    },
    { 
      key: 'action_items', 
      label: 'Action Items', 
      icon: CheckSquare, 
      color: 'green',
      description: 'Extract actionable tasks and recommendations'
    }
  ];

  // Free plan upgrade prompt
  if (userPlan === 'free') {
    return (
      <div className="p-6 space-y-6">
        {/* Upgrade Card */}
        <div className="text-center p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-2xl border-2 border-dashed border-purple-200">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">AI Analysis</h3>
          <p className="text-gray-600 mb-6 max-w-sm mx-auto">
            Unlock powerful AI insights, summaries, and actionable recommendations for your documents
          </p>
          
          {/* Feature preview */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {analysisTypes.map(({ key, label, icon: Icon, color }) => (
              <div 
                key={key}
                className="p-3 bg-white rounded-xl border border-gray-200 opacity-60"
              >
                <Icon className={`w-6 h-6 text-${color}-500 mx-auto mb-2`} />
                <p className="text-sm font-medium text-gray-700">{label}</p>
              </div>
            ))}
          </div>
          
          <button
            onClick={onUpgradeClick}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            <Crown className="w-4 h-4" />
            Upgrade to Pro
          </button>
          <p className="text-xs text-gray-500 mt-3">
            Starting at $9/month • Cancel anytime
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center pb-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">AI Analysis</h3>
        <p className="text-sm text-gray-600">Generate insights from your document</p>
      </div>

      {/* Analysis Types Grid */}
      <div className="grid grid-cols-1 gap-4">
        {analysisTypes.map(({ key, label, icon: Icon, color, description }) => {
          const hasAnalysis = analyses[key];
          const isLoading = loadingType === key;
          const isExisting = existingAnalyses[key];
          
          return (
            <div key={key} className="space-y-3">
              {/* Analysis Button */}
              <div className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                hasAnalysis 
                  ? `border-${color}-200 bg-${color}-50` 
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      hasAnalysis ? `bg-${color}-100` : 'bg-white'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        hasAnalysis ? `text-${color}-600` : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{label}</h4>
                      <p className="text-xs text-gray-500">{description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {hasAnalysis && (
                      <button
                        onClick={() => refreshAnalysis(key)}
                        disabled={loading}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Regenerate analysis"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => generateAnalysis(key)}
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                        hasAnalysis
                          ? `bg-${color}-100 text-${color}-700 hover:bg-${color}-200`
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </div>
                      ) : hasAnalysis ? (
                        'View'
                      ) : (
                        'Generate'
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Show timestamp if cached */}
                {hasAnalysis && analyses[key].generatedAt && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                    <Clock className="w-3 h-3" />
                    Generated {new Date(analyses[key].generatedAt).toLocaleDateString()} at {new Date(analyses[key].generatedAt).toLocaleTimeString()}
                    {analyses[key].cached && <span className="ml-1">(cached)</span>}
                  </div>
                )}
              </div>

              {/* Analysis Result */}
              {hasAnalysis && (
                <div className={`p-4 rounded-xl border bg-white`}>
                  <div className="prose prose-sm max-w-none">
                    {key === 'summary' && (
                      <div className="whitespace-pre-wrap text-gray-800">
                        {analyses[key].summary}
                      </div>
                    )}
                    {key === 'insights' && (
                      <div className="whitespace-pre-wrap text-gray-800">
                        {analyses[key].insights}
                      </div>
                    )}
                    {key === 'questions' && (
                      <div className="whitespace-pre-wrap text-gray-800">
                        {analyses[key].questions}
                      </div>
                    )}
                    {key === 'action_items' && (
                      <div className="whitespace-pre-wrap text-gray-800">
                        {analyses[key].actionItems}
                      </div>
                    )}
                  </div>
                  
                  {/* Analysis metadata */}
                  {analyses[key].metadata && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {analyses[key].wordCount && (
                          <span>Words: {analyses[key].wordCount}</span>
                        )}
                        {analyses[key].fileType && (
                          <span>Type: {analyses[key].fileType}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="font-medium">Generating Analysis...</span>
            </div>
            <p className="text-sm text-gray-600">
              This may take a few moments. Please don't close this window.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileAnalytics;
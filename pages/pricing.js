import { useState, useEffect } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { 
  Check, 
  Crown, 
  Sparkles, 
  Star, 
  ArrowLeft,
  Zap,
  Shield,
  MessageCircle,
  FileText,
  TrendingUp,
  CreditCard,
  Settings
} from 'lucide-react';

export default function Pricing() {
  const user = useUser();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const fetchUserData = async () => {
    try {
      // Fetch current subscription
      const { data: userData } = await supabase
        .from('users')
        .select('subscription_tier, subscription_status, daily_prompts_used, razorpay_customer_id, razorpay_subscription_id')
        .eq('id', user.id)
        .single();
      
      setCurrentSubscription(userData);

      // Fetch current usage
      const { data: usageData } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('usage_date', new Date().toISOString().split('T')[0])
        .single();
      
      setUsage(usageData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '₹0',
      period: '/month',
      description: 'Perfect for getting started',
      prompts: '10 prompts/day',
      icon: Star,
      color: 'gray',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      buttonColor: 'bg-gray-600 hover:bg-gray-700',
      features: [
        '10 daily prompts',
        'Basic document analysis (Gemini Flash)',
        'Single file chat',
        'File upload (up to 10MB)',
        'PDF & DOC support only',
        'Basic insights',
        'Community support'
      ],
      limitations: [
        'Limited to 10 prompts per day',
        'Basic AI model only',
        'Single file analysis',
        'No Excel/PowerPoint support',
        'No advanced features'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '₹9',
      period: '/month',
      description: 'Best for professionals',
      prompts: '25 prompts/day',
      icon: Sparkles,
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
      popular: true,
      features: [
        '25 daily prompts',
        'Advanced AI analysis (Gemini Pro)',
        'Multi-file comparison (up to 5 files)',
        'File upload (up to 25MB)',
        'All file formats (PDF, DOC, XLS, PPT)',
        'Advanced insights & analytics',
        'Document annotations',
        'Enhanced accuracy & depth',
        'Priority support'
      ],
      limitations: []
    },
    {
      id: 'legend',
      name: 'Legend',
      price: '₹15',
      period: '/month',
      description: 'For power users & teams',
      prompts: '50 prompts/day',
      icon: Crown,
      color: 'purple',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      buttonColor: 'bg-purple-600 hover:bg-purple-700',
      features: [
        '50 daily prompts',
        'Premium AI analysis (Gemini Pro)',
        'Unlimited file comparison (up to 10 files)',
        'File upload (up to 50MB)',
        'All file formats + advanced processing',
        'AI-powered insights & predictive analytics',
        'Executive summaries & strategic insights',
        'Team workspaces & collaboration',
        'API access (1,000 calls/month)',
        'Data export & custom integrations',
        'Advanced analytics dashboard',
        'White-glove support'
      ],
      limitations: []
    }
  ];

  const handleUpgrade = async (planId) => {
    if (!user) {
      router.push('/');
      return;
    }

    setLoading(true);
    setSelectedPlan(planId);

    try {
      if (planId === 'free') {
        // Handle downgrade to free
        await handleDowngrade();
      } else {
        // Handle upgrade to paid plan
        await handlePaidUpgrade(planId);
      }
    } catch (error) {
      console.error('Error handling plan change:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const handleDowngrade = async () => {
    try {
      if (currentSubscription?.razorpay_subscription_id) {
        // Cancel the subscription
        const response = await fetch('/api/cancel-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: user.id,
            cancelAtCycleEnd: true 
          }),
        });
        
        const result = await response.json();
        if (result.success) {
          alert(result.message);
          router.push('/dashboard');
        } else {
          throw new Error(result.error);
        }
      } else {
        // Direct downgrade if no active subscription
        const { error } = await supabase
          .from('users')
          .update({ 
            subscription_tier: 'free',
            subscription_status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error downgrading:', error);
      throw error;
    }
  };

  const handlePaidUpgrade = async (planId) => {
    try {
      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          userId: user.id,
          paymentType: 'order', // Use 'subscription' for recurring payments
        }),
      });

      const checkoutData = await response.json();
      
      if (checkoutData.error) {
        throw new Error(checkoutData.error);
      }

      if (checkoutData.type === 'order') {
        // Open Razorpay checkout
        const options = {
          key: checkoutData.keyId,
          amount: checkoutData.amount,
          currency: checkoutData.currency,
          name: 'DocuMind',
          description: `Upgrade to ${planId.toUpperCase()} plan`,
          order_id: checkoutData.orderId,
          prefill: {
            name: checkoutData.userName,
            email: checkoutData.userEmail,
          },
          theme: {
            color: planId === 'pro' ? '#3B82F6' : '#7C3AED',
          },
          handler: async function (response) {
            try {
              setLoading(true);
              
              // Verify payment
              const verifyResponse = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  userId: user.id,
                  planId: planId,
                }),
              });

              const verifyResult = await verifyResponse.json();
              
              if (verifyResult.success) {
                alert('Payment successful! Your subscription has been upgraded.');
                router.push('/dashboard');
              } else {
                throw new Error(verifyResult.error);
              }
            } catch (error) {
              console.error('Payment verification failed:', error);
              alert('Payment verification failed. Please contact support.');
            } finally {
              setLoading(false);
            }
          },
          modal: {
            ondismiss: function() {
              setLoading(false);
              setSelectedPlan(null);
            }
          }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
        
      } else if (checkoutData.type === 'subscription') {
        // Handle subscription URL (if using subscription model)
        if (checkoutData.shortUrl) {
          window.open(checkoutData.shortUrl, '_blank');
        }
      }

    } catch (error) {
      console.error('Error creating checkout:', error);
      throw error;
    }
  };

  const handleManageBilling = async () => {
    if (!currentSubscription?.razorpay_subscription_id) {
      alert('No active subscription found');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const result = await response.json();
      if (result.success) {
        alert(result.message);
        fetchUserData(); // Refresh user data
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error managing billing:', error);
      alert('Failed to manage billing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = (plan) => {
    if (loading && selectedPlan === plan.id) {
      return (
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          Processing...
        </div>
      );
    }

    if (currentSubscription?.subscription_tier === plan.id) {
      return plan.id === 'free' ? 'Current Plan' : (
        <div className="flex items-center justify-center gap-2">
          <Check size={16} />
          Current Plan
        </div>
      );
    }

    if (plan.id === 'free') {
      return 'Downgrade to Free';
    }

    return `Upgrade to ${plan.name}`;
  };

  const isCurrentPlan = (planId) => {
    return currentSubscription?.subscription_tier === planId;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back to Dashboard</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">DocuMind</h1>
              </div>
            </div>
            
            {currentSubscription?.razorpay_subscription_id && (
              <button
                onClick={handleManageBilling}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Settings size={16} />
                Manage Subscription
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Current Usage Banner */}
      {currentSubscription && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span className="font-medium">Current: {currentSubscription.subscription_tier.toUpperCase()}</span>
                </div>
                <div className="text-blue-100">
                  {currentSubscription.daily_prompts_used || 0} prompts used today
                </div>
              </div>
              {currentSubscription.subscription_status === 'canceled' && (
                <div className="text-yellow-300 font-medium">
                  Subscription canceled - upgrade to continue premium features
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Unlock the full potential of AI-powered document analysis with our flexible pricing plans
          </p>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg inline-block">
            <p className="text-blue-800 font-medium">
              🚀 Pro & Legend users get access to advanced Gemini Pro AI model for superior accuracy and insights
            </p>
          </div>
          <div className="mt-4 p-3 bg-green-50 rounded-lg inline-block">
            <p className="text-green-800 text-sm">
              💳 Secure payments powered by Razorpay • 100% Safe & Encrypted
            </p>
          </div>
        </div>

        {/* AI Model Comparison */}
        <div className="mb-12 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-center mb-6">AI Model Comparison</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <Star className="w-6 h-6 text-gray-600" />
              </div>
              <h3 className="font-semibold mb-2">Free: Gemini Flash</h3>
              <p className="text-sm text-gray-600">Fast, basic analysis for everyday tasks</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2 text-blue-800">Pro: Gemini Pro</h3>
              <p className="text-sm text-blue-600">Advanced reasoning and professional insights</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <Crown className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2 text-purple-800">Legend: Gemini Pro+</h3>
              <p className="text-sm text-purple-600">Maximum accuracy with strategic insights and analytics</p>
            </div>
          </div>
        </div>

        {/* Features Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Smart Chat</h3>
            <p className="text-gray-600">Interact naturally with your documents using advanced AI</p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Deep Analysis</h3>
            <p className="text-gray-600">Get comprehensive insights from PDFs, documents, and more</p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
            <p className="text-gray-600">Track usage and gain valuable insights from your data</p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const current = isCurrentPlan(plan.id);
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 ${plan.borderColor} ${plan.bgColor} p-8 transition-all duration-200 hover:shadow-lg ${
                  plan.popular ? 'transform scale-105 shadow-xl' : ''
                } ${current ? 'ring-2 ring-green-500' : ''}`}
              >
                {plan.popular && !current && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </div>
                  </div>
                )}

                {current && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                      <Check size={12} />
                      Current Plan
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`w-12 h-12 bg-${plan.color}-100 rounded-xl mx-auto mb-4 flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 text-${plan.color}-600`} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="flex items-end justify-center gap-1 mb-2">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 mb-1">{plan.period}</span>
                  </div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-${plan.color}-100 text-${plan.color}-700 text-sm font-medium`}>
                    <Zap className="w-4 h-4" />
                    {plan.prompts}
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <h4 className="font-semibold text-gray-900">Features included:</h4>
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading || current}
                  className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                    current 
                      ? 'bg-green-500 cursor-default' 
                      : plan.buttonColor
                  } ${
                    loading && selectedPlan === plan.id 
                      ? 'opacity-50 cursor-not-allowed' 
                      : !current ? 'transform hover:scale-105' : ''
                  }`}
                >
                  {getButtonText(plan)}
                </button>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Detailed Feature Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-xl border border-gray-200">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 font-semibold text-gray-900">Feature</th>
                  <th className="text-center p-4 font-semibold text-gray-600">Free</th>
                  <th className="text-center p-4 font-semibold text-blue-600">Pro</th>
                  <th className="text-center p-4 font-semibold text-purple-600">Legend</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium">AI Model</td>
                  <td className="p-4 text-center">Gemini Flash</td>
                  <td className="p-4 text-center text-blue-600 font-semibold">Gemini Pro</td>
                  <td className="p-4 text-center text-purple-600 font-semibold">Gemini Pro+</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium">Daily Prompts</td>
                  <td className="p-4 text-center">10</td>
                  <td className="p-4 text-center">25</td>
                  <td className="p-4 text-center">50</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium">Max File Size</td>
                  <td className="p-4 text-center">10MB</td>
                  <td className="p-4 text-center">25MB</td>
                  <td className="p-4 text-center text-purple-600 font-semibold">50MB</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium">Multi-file Analysis</td>
                  <td className="p-4 text-center">❌</td>
                  <td className="p-4 text-center text-blue-600">✅ (5 files)</td>
                  <td className="p-4 text-center text-purple-600">✅ (10 files)</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium">Excel/PowerPoint Support</td>
                  <td className="p-4 text-center">❌</td>
                  <td className="p-4 text-center text-blue-600">✅</td>
                  <td className="p-4 text-center text-purple-600">✅</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium">Document Annotations</td>
                  <td className="p-4 text-center">❌</td>
                  <td className="p-4 text-center text-blue-600">✅</td>
                  <td className="p-4 text-center text-purple-600">✅</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium">Data Export</td>
                  <td className="p-4 text-center">❌</td>
                  <td className="p-4 text-center">❌</td>
                  <td className="p-4 text-center text-purple-600 font-semibold">✅</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Support Level</td>
                  <td className="p-4 text-center">Community</td>
                  <td className="p-4 text-center text-blue-600">Priority</td>
                  <td className="p-4 text-center text-purple-600 font-semibold">White-glove</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Can I change my plan anytime?</h3>
              <p className="text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time. Upgrades are immediate, and downgrades take effect at the end of your billing cycle.
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">What&apos;s the difference between AI models?</h3>
              <p className="text-gray-600">
                Gemini Flash (Free) provides quick analysis, while Gemini Pro (Pro/Legend) offers superior reasoning, accuracy, and deeper insights for professional use.
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">What happens if I exceed my daily prompts?</h3>
              <p className="text-gray-600">
                Your prompts reset daily. If you consistently need more, consider upgrading to a higher tier plan with more daily prompts.
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Is my data secure?</h3>
              <p className="text-gray-600">
                Yes, we use enterprise-grade encryption and security measures to protect your documents and conversations. Your data is never used to train AI models.
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">How secure are Razorpay payments?</h3>
              <p className="text-gray-600">
                Razorpay is PCI DSS compliant and uses 256-bit SSL encryption. All payment data is processed securely and we never store your payment information.
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Can I get a refund?</h3>
              <p className="text-gray-600">
                We offer a 7-day money-back guarantee for new subscriptions. Contact our support team if you&apos;re not satisfied within the first week.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Section */}
        <div className="mt-16 text-center">
          <div className="flex items-center justify-center gap-8 text-gray-400 mb-8">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm">Enterprise Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span className="text-sm">99.9% Uptime</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              <span className="text-sm">24/7 Support</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              <span className="text-sm">Secure Payments</span>
            </div>
          </div>
          <p className="text-gray-500 text-sm">
            Trusted by thousands of professionals worldwide. All payments processed securely by Razorpay.
          </p>
        </div>
      </div>
    </div>
  );
}
import { useEffect } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { 
  FileText, 
  MessageCircle, 
  Brain, 
  Shield, 
  Zap, 
  Users,
  ArrowRight,
  CheckCircle 
} from 'lucide-react';
import AuthButton from '../components/AuthButton';

export default function Home() {
  const user = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (user) return null; // Will redirect to dashboard

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-transparent sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block">Your AI-Powered</span>
                  <span className="block text-blue-600">Document Assistant</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Upload any document and have intelligent conversations about its content. 
                  FileMentor helps you understand, analyze, and extract insights from your files 
                  using advanced AI technology.
                </p>
                
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <AuthButton />
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <a
                      href="#features"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 md:py-4 md:text-lg md:px-10 transition-colors"
                    >
                      Learn More
                      <ArrowRight size={20} className="ml-2" />
                    </a>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="mt-8 grid grid-cols-3 gap-4 sm:gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">15MB</div>
                    <div className="text-sm text-gray-600">Max file size</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">10</div>
                    <div className="text-sm text-gray-600">Daily prompts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">∞</div>
                    <div className="text-sm text-gray-600">File storage</div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        
        {/* Hero Image/Illustration */}
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-56 w-full bg-gradient-to-br from-blue-400 to-purple-600 sm:h-72 md:h-96 lg:w-full lg:h-full relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="grid grid-cols-2 gap-8 opacity-20">
                <FileText size={120} className="text-white" />
                <MessageCircle size={120} className="text-white" />
                <Brain size={120} className="text-white" />
                <Zap size={120} className="text-white" />
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Everything you need to understand your documents
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Powerful AI features to help you work smarter with your files
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-white p-8 rounded-lg shadow-lg">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-md mb-4">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Multi-Format Support</h3>
                <p className="text-gray-600">
                  Upload PDF, DOC, DOCX, and image files. Our AI can extract and understand 
                  content from various document formats.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-white p-8 rounded-lg shadow-lg">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-md mb-4">
                  <Brain className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Intelligent Analysis</h3>
                <p className="text-gray-600">
                  Ask questions, get summaries, extract key insights, and have natural 
                  conversations about your document content.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-white p-8 rounded-lg shadow-lg">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-md mb-4">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Chat History</h3>
                <p className="text-gray-600">
                  All your conversations are saved and organized. Return to any previous 
                  chat session anytime you need.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-white p-8 rounded-lg shadow-lg">
                <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-md mb-4">
                  <Shield className="w-6 h-6 text-yellow-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Secure & Private</h3>
                <p className="text-gray-600">
                  Your documents are encrypted and stored securely. Only you have access 
                  to your files and conversations.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-white p-8 rounded-lg shadow-lg">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-md mb-4">
                  <Zap className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Smart Suggestions</h3>
                <p className="text-gray-600">
                  Get contextual prompt suggestions based on your document type and content 
                  to help you ask the right questions.
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-white p-8 rounded-lg shadow-lg">
                <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-md mb-4">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Easy to Use</h3>
                <p className="text-gray-600">
                  Simple drag-and-drop interface, intuitive chat design, and seamless 
                  Google authentication. Start chatting in seconds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Your Document</h3>
              <p className="text-gray-600">
                Drag and drop or click to upload your PDF, Word document, or image file. 
                Files up to 15MB are supported.
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-purple-600 text-white rounded-full text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Ask Questions</h3>
              <p className="text-gray-600">
                Type your questions about the document or use our smart suggestions. 
                The AI will analyze and provide detailed answers.
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-green-600 text-white rounded-full text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Get Insights</h3>
              <p className="text-gray-600">
                Receive intelligent responses, summaries, and insights. All conversations 
                are saved for future reference.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">Ready to get started?</span>
            <span className="block text-blue-200">Start chatting with your documents today.</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-blue-200">
            Join thousands of users who are already using FileMentor to understand their documents better.
          </p>
          <div className="mt-8">
            <AuthButton />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <div className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">GitHub</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="mt-8 md:mt-0 md:order-1">
            <p className="text-center text-base text-gray-400">
              &copy; 2024 FileMentor. Built with ❤️ using Next.js and Supabase.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { LogIn, LogOut, User, Mail } from 'lucide-react';

export default function AuthButton() {
  const user = useUser();
  const supabase = useSupabaseClient();

  const handleSignIn = async () => {
    const redirectTo =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000/dashboard"
        : "https://docu-mind-afsk.vercel.app/dashboard";
  
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });
  };
  

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (user) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        {/* User Profile Section */}
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
          <div className="relative">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              {user.user_metadata?.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="Profile" 
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-2 ring-white/30"
                />
              ) : (
                <User size={16} className="sm:w-5 sm:h-5 text-white" />
              )}
            </div>
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow-sm"></div>
          </div>
          
          <div className="hidden sm:flex flex-col min-w-0">
            <span className="text-sm font-medium text-gray-800 truncate max-w-[140px] md:max-w-[180px]">
              {user.user_metadata?.name || 'User'}
            </span>
            <span className="text-xs text-gray-500 truncate max-w-[140px] md:max-w-[180px]">
              {user.email}
            </span>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="group relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md border border-red-200 hover:border-red-300"
        >
          <LogOut size={16} className="sm:w-4 sm:h-4 transition-transform group-hover:scale-110" />
          <span className="hidden xs:block text-sm font-medium">Sign Out</span>
          
          {/* Hover tooltip for mobile */}
          <div className="xs:hidden absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            Sign Out
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] w-full max-w-md mx-auto p-6">
      {/* Welcome Section */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg">
          <Mail size={24} className="text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
          Welcome to DocuMind
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          Sign in to access your documents and start chatting with AI
        </p>
      </div>

      {/* Sign In Button */}
      <button
        onClick={handleSignIn}
        className="group relative w-full max-w-sm flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-lg"
      >
        {/* Google Icon */}
        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-3 h-3">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        </div>
        
        <span className="text-base sm:text-lg">Continue with Google</span>
        
        {/* Loading animation */}
        <LogIn size={20} className="transition-transform group-hover:translate-x-1" />
        
        {/* Shine effect */}
        <div className="absolute inset-0 -top-1 -bottom-1 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
      </button>

      {/* Security Notice */}
      <p className="text-xs text-gray-500 text-center mt-4 max-w-xs leading-relaxed">
        Secure authentication powered by Google. We protect your privacy and never share your data.
      </p>
    </div>
  );
}

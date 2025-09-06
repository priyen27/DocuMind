import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { LogIn, LogOut, User } from 'lucide-react';

export default function AuthButton() {
  const user = useUser();
  const supabase = useSupabaseClient();

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
    //   options: {
    //     redirectTo: `${window.location.origin}/auth/callback`
    //   }
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            {user.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Profile" 
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <User size={16} className="text-blue-600" />
            )}
          </div>
          <span className="hidden sm:block">{user.user_metadata?.name || user.email}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          <span className="hidden sm:block">Sign Out</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
    >
      <LogIn size={20} />
      Sign in with Google
    </button>
  );
}
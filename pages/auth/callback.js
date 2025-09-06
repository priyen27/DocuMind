import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

export default function AuthCallback() {
  const router = useRouter();
  const supabase = useSupabaseClient();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth error:', error);
        router.push('/');
        return;
      }

      if (data.session) {
        // Create or update user profile
        const { error: profileError } = await supabase
          .from('users')
          .upsert({
            id: data.session.user.id,
            email: data.session.user.email,
            name: data.session.user.user_metadata?.name,
            avatar_url: data.session.user.user_metadata?.avatar_url
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        router.push('/dashboard');
      } else {
        router.push('/');
      }
    };

    handleAuthCallback();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
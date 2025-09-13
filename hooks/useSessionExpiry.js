import { useEffect } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';

export function useSessionExpiry() {
  const user = useUser();
  const supabase = useSupabaseClient();

  useEffect(() => {
    if (!user) return;

    const checkSessionAge = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Get the JWT payload to check when it was issued
          const tokenPayload = JSON.parse(atob(session.access_token.split('.')[1]));
          const issuedAt = tokenPayload.iat * 1000; // Convert to milliseconds
          const now = Date.now();
          const hoursPassed = (now - issuedAt) / (1000 * 60 * 60);

          console.log(`Session age: ${hoursPassed.toFixed(1)} hours`);

          // Force logout after 24 hours
          if (hoursPassed >= 24) {
            console.log('Session expired after 24 hours, logging out...');
            await supabase.auth.signOut();
            toast.error('Your session has expired after 24 hours. Please sign in again.', {
              duration: 5000,
              position: 'top-center'
            });
            
            // Clear any local storage if you're using it
            localStorage.removeItem('login_time');
          } else if (hoursPassed >= 20) {
            // Warning at 20 hours (4 hours before expiry)
            const remainingHours = 24 - hoursPassed;
            toast.warning(`Your session will expire in ${remainingHours.toFixed(1)} hours`, {
              duration: 4000,
              position: 'top-right'
            });
          }
        }
      } catch (error) {
        console.error('Error checking session age:', error);
      }
    };

    // Check immediately
    checkSessionAge();
    
    // Check every hour
    const interval = setInterval(checkSessionAge, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, supabase]);
}
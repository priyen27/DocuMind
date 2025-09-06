import { React } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import AuthButton from './AuthButton';
import { Toaster } from 'react-hot-toast';

export default function Layout({ children }) {
  const user = useUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {user ? (
        <>{children}</>
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="max-w-md w-full space-y-8 p-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">DocuMind</h1>
              <p className="text-gray-600 mb-8">AI-powered document analysis and chat</p>
              <AuthButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
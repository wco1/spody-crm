'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '../utils/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        console.log('Checking authentication in ProtectedRoute...');
        const user = await getCurrentUser();
        
        if (user) {
          setIsAuthenticated(true);
        } else {
          console.log('Not authenticated in ProtectedRoute, redirecting to login');
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Ошибка при проверке аутентификации:', error);
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    }
    
    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
} 
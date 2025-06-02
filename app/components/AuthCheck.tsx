'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, supabase } from '../utils/supabase';
import LoadingSpinner from './LoadingSpinner';

interface AuthCheckProps {
  children: React.ReactNode;
}

export default function AuthCheck({ children }: AuthCheckProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        console.log('Checking authentication status...');
        const user = await getCurrentUser();
        
        console.log('Auth check result:', user ? `User found: ${user.email}` : 'No authenticated user found');
        
        if (user) {
          console.log('User is authenticated, showing protected content');
          
          // Устанавливаем заголовки для последующих API запросов
          const setAuthHeader = async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              
              if (session?.access_token) {
                localStorage.setItem('supabase.auth.token', session.access_token);
                console.log('Auth token set for API requests');
              } else if (localStorage.getItem('authMethod') === 'local') {
                // Для локальной авторизации используем демо-токен
                localStorage.setItem('supabase.auth.token', 'demo_token_for_local_auth');
                console.log('Demo auth token set for local authentication');
              }
            } catch (err) {
              // Тихо устанавливаем демо-токен при ошибке
              if (localStorage.getItem('authMethod') === 'local') {
                localStorage.setItem('supabase.auth.token', 'demo_token_for_local_auth');
                console.log('Demo auth token set after error');
              }
            }
          };
          
          await setAuthHeader();
          setIsAuthenticated(true);
        } else {
          console.log('User is not authenticated, redirecting to login');
          router.push('/auth/login');
        }
      } catch (error) {
        // Обрабатываем ошибки проверки аутентификации тихо если есть локальная сессия
        if (localStorage.getItem('isLoggedIn') === 'true') {
          console.log('Auth error occurred but found login state in localStorage, showing content');
          
          // Установить демо-токен
          localStorage.setItem('supabase.auth.token', 'demo_token_for_local_auth');
          
          setIsAuthenticated(true);
        } else {
          console.log('Auth error and no login state, redirecting to login');
          router.push('/auth/login');
        }
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  // Также настраиваем обработчик для API запросов, чтобы добавлять токен авторизации
  useEffect(() => {
    // Функция для перехвата и модификации fetch запросов
    const originalFetch = window.fetch;
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      // Создаем копию init или пустой объект, если он не был передан
      const modifiedInit = init ? { ...init } : {};
      
      // Убедимся, что headers существует
      if (!modifiedInit.headers) {
        modifiedInit.headers = {};
      }
      
      // Получаем токен из localStorage
      const authToken = localStorage.getItem('supabase.auth.token');
      
      // Если токен существует и это запрос к известному API, добавляем заголовок авторизации
      if (authToken && typeof input === 'string' && 
         (input.includes('supabase') || input.includes('/api/'))) {
        // Добавляем заголовок авторизации
        (modifiedInit.headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
      }
      
      // Вызываем оригинальный fetch с модифицированными параметрами
      return originalFetch.call(window, input, modifiedInit);
    };
    
    // Функция очистки - восстанавливаем оригинальный fetch при размонтировании компонента
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (isLoading) {
    return <LoadingSpinner fullScreen size="md" />;
  }

  if (!isAuthenticated) {
    return null;
  }

    return <>{children}</>;
} 
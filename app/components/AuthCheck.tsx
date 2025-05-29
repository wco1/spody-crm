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
        
        // Проверяем авторизацию через getCurrentUser, которая уже включает гибридную проверку
        const user = await getCurrentUser();
        console.log('Auth check result:', user ? `User found: ${user.email}` : 'No authenticated user found');
        
        if (user) {
          // Пользователь авторизован (через Supabase или локальный fallback)
          console.log('User is authenticated, showing protected content');
          
          // Устанавливаем заголовок авторизации для будущих запросов
          const setAuthHeader = async () => {
            try {
              // Попытка получить сессию из Supabase
              const { data: { session } } = await supabase.auth.getSession();
              
              if (session?.access_token) {
                // Если есть токен, устанавливаем его в локальное хранилище
                localStorage.setItem('supabase.auth.token', session.access_token);
                console.log('Auth token set for API requests');
              } else if (localStorage.getItem('authMethod') === 'local') {
                // Если используется локальная авторизация, устанавливаем демо-токен
                localStorage.setItem('supabase.auth.token', 'demo_token_for_local_auth');
                console.log('Demo auth token set for local authentication');
              }
            } catch (err) {
              console.error('Error setting auth header:', err);
              // Если произошла ошибка, но есть локальная авторизация
              if (localStorage.getItem('authMethod') === 'local') {
                localStorage.setItem('supabase.auth.token', 'demo_token_for_local_auth');
                console.log('Demo auth token set after error');
              }
            }
          };
          
          await setAuthHeader();
          setIsAuthenticated(true);
        } else {
          // Если пользователь не авторизован, перенаправляем на страницу входа
          console.log('User is not authenticated, redirecting to login');
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Error in AuthCheck:', error);
        
        // При непредвиденной ошибке проверяем localStorage как запасной вариант
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (isLoggedIn) {
          console.log('Auth error occurred but found login state in localStorage, showing content');
          
          // Устанавливаем демо-токен для запросов API
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
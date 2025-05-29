'use client';

import { useState, useEffect } from 'react';
import { User, LogOut, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signOut, getCurrentUser } from '../utils/supabase';

// Define a type that includes possible Supabase user properties
interface UserWithMetadata {
  id: string;
  email?: string;
  role?: string;
  app_metadata?: {
    role?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export default function UserProfile() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function fetchUserData() {
      try {
        const user = await getCurrentUser() as UserWithMetadata | null;
        if (user) {
          setUserEmail(user.email || 'admin@spody.app');
          
          // Получаем роль из app_metadata, если доступно
          const role = user.app_metadata?.role || user.role || 'admin';
          setUserRole(role);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    }

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      const result = await signOut();
      if (result.success) {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Error signing out:', error);
      // Даже в случае ошибки перенаправляем на страницу логина
      router.push('/auth/login');
    }
  };

  return (
    <div className="relative inline-block">
      <button 
        className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span className="sr-only">Открыть меню пользователя</span>
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm hover:shadow transition-all">
          <User className="h-5 w-5" />
        </div>
      </button>
      
      {menuOpen && (
        <div className="dropdown-menu w-56 right-0 mt-2">
          <div className="py-3 px-4 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{userEmail}</p>
            <p className="text-xs text-gray-500 mt-1 capitalize">{userRole}</p>
          </div>
          <div className="py-1">
            <a href="/settings" className="dropdown-item">
              <Settings className="mr-3 h-4 w-4 text-gray-500" />
              Настройки профиля
            </a>
            <button 
              onClick={handleLogout}
              className="dropdown-item text-red-600 hover:bg-red-50 w-full text-left"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Выйти
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 
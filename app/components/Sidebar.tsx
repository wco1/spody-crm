'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, Bot, Cog, LogOut, Link as LinkIcon } from 'lucide-react';

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname();

  const navigationItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: Home,
      isActive: pathname === '/dashboard'
    },
    {
      href: '/analytics',
      label: 'Аналитика',
      icon: BarChart3,
      isActive: pathname === '/analytics'
    },
    {
      href: '/tracking',
      label: 'Трекинговые ссылки',
      icon: LinkIcon,
      isActive: pathname === '/tracking'
    },
    {
      href: '/models',
      label: 'Модели ИИ',
      icon: Bot,
      isActive: pathname === '/models'
    },
    {
      href: '/settings',
      label: 'Настройки',
      icon: Cog,
      isActive: pathname === '/settings'
    }
  ];

  return (
    <div className={`bg-white border-r border-gray-200 w-64 min-h-screen flex flex-col ${className}`}>
      {/* Логотип */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Spody Admin</h1>
            <p className="text-xs text-gray-500">Management Panel</p>
          </div>
        </Link>
      </div>

      {/* Навигационные ссылки */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  item.isActive
                    ? 'bg-indigo-100 text-indigo-700 border-r-2 border-indigo-600'
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Профиль и выход */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-600 font-medium text-sm">А</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Администратор</p>
            <p className="text-xs text-gray-500 truncate">admin@spody.app</p>
          </div>
        </div>
        <button className="flex items-center w-full px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut className="w-4 h-4 mr-3" />
          Выйти
        </button>
      </div>
    </div>
  );
} 
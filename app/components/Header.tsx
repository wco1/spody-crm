'use client';

import { Bell, Search } from 'lucide-react';
import UserProfile from './UserProfile';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm backdrop-blur-sm bg-white/80">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="input pl-10 py-2 bg-gray-50 border-0 focus:bg-white transition-all"
              placeholder="Search..."
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="relative p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <span className="sr-only">View notifications</span>
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
          </button>
          
          <UserProfile />
        </div>
      </div>
    </header>
  );
} 
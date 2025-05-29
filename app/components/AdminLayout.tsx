'use client';

import Sidebar from './Sidebar';
import Header from './Header';
import AuthCheck from './AuthCheck';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthCheck>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto animate-fadeIn">
              {children}
            </div>
          </main>
        </div>
        
        <style jsx global>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-in-out;
          }
        `}</style>
      </div>
    </AuthCheck>
  );
} 
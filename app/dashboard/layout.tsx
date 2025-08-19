"use client";
import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';

import { Menu, X } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

import { AnimatePresence, motion } from "framer-motion";

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = typeof document !== 'undefined' 
          ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1")
          : null;
        
        if (!token) {
          router.push('/Auth/login');
          return;
        }

        const response = await fetch('/api/auth/verify', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Authentication failed');
        }

        const data = await response.json();
        setUser(data.user);
        
        if (data.user.userType === 'ADMIN') {
          router.push('/admin');
          return;
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Authentication error:', error);
        
        if (typeof document !== 'undefined') {
          document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
        
        router.push('/Auth/login');
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading || (user && user.userType === 'ADMIN')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AnimatePresence>
        {isSidebarOpen && <Sidebar open={isSidebarOpen} />}
      </AnimatePresence>
      <main className={`flex-1 overflow-auto min-h-screen transition-all duration-300 ${isSidebarOpen ? "ml-64" : "ml-0"}`}>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 m-4 bg-gray-200 rounded-md">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;

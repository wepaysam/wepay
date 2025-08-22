"use client";
import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';

import { Menu, X } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

import { AnimatePresence, motion } from "framer-motion";

import { useGlobalContext } from '../context/GlobalContext';

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const router = useRouter();
  const { isSidebarOpen, setSidebarOpen } = useGlobalContext();
  const [isLoading, setIsLoading] = useState(true);
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

  return (
    <div className="flex min-h-screen">
      <AnimatePresence>
        {isSidebarOpen && <Sidebar open={isSidebarOpen} />}
      </AnimatePresence>
      <main className={`flex-1 overflow-auto min-h-screen transition-all duration-300 ${isSidebarOpen ? "ml-[270px]" : "ml-0"}`}>
        <button 
          onClick={() => setSidebarOpen(!isSidebarOpen)} 
          className={`fixed top-4 p-2 bg-gray-200 dark:bg-gray-800 rounded-md z-50 ${isSidebarOpen ? "left-[270px]" : "left-4"}`}
        >
          {isSidebarOpen ? <X className="text-gray-800 dark:text-gray-200" /> : <Menu className="text-gray-800 dark:text-gray-200" />}
        </button>
        <div>
          {isLoading || (user && user.userType === 'ADMIN') ? (
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;

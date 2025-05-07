"use client";
import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get token from cookies
        const token = typeof document !== 'undefined' 
          ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1")
          : null;
        
        if (!token) {
          router.push('/Auth/login');
          return;
        }

        // Check if user is authenticated and get user type
        const response = await fetch('/api/auth/verify', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Authentication failed');
        }

        const data = await response.json();
        
        // If user is admin, redirect to admin dashboard
        if (data.user.userType === 'ADMIN') {
          router.push('/admin');
          return;
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Authentication error:', error);
        
        // Clear token cookie
        if (typeof document !== 'undefined') {
          document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
        
        router.push('/Auth/login');
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar open={false}  />
      <main className={`flex-1 overflow-auto min-h-screen transition-all duration-300 ${isAdmin ? "ml-64" : "ml-0"}`}>

        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;

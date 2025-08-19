"use client";
import React, { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import AdminSidebar from "../components/AdminSidebar";
import { AnimatePresence, motion } from "framer-motion";
import ThemeToggle from "../components/ThemeToggle";
import { Menu, X } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  useEffect(() => {
    const checkAuth = async () => {
      // Get token from document.cookie
      const token = typeof document !== 'undefined' 
        ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1")
        : null;
      
      if (!token) {
        console.log("No token found in cookies, redirecting to login");
        router.push('/Auth/login');
        return;
      }

      // Verify the token and check if user is admin
      try {
        const response = await fetch('/api/auth/verify', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          console.log("Token verification failed, redirecting to login");
          router.push('/Auth/login');
          return;
        }

        const data = await response.json();
        console.log("Verify response:", data);
        
        if (data.user.userType !== 'ADMIN') {
          // Not an admin, redirect to home
          console.log("User is not an admin, redirecting to home");
          router.push('/');
          return;
        }

        setIsAuthenticated(true);
        setIsAdmin(true);
      } catch (error) {
        console.error('Authentication error:', error);
        router.push('/Auth/login');
      } finally {
        setIsLoading(false);
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

  if (!isAuthenticated || !isAdmin) {
    return null; // Will redirect in the useEffect
  }

  return (
    <div className="flex w-full min-h-screen bg-background dark:bg-background-dark">
      <AnimatePresence>
        {sidebarOpen && <AdminSidebar open={sidebarOpen} toggleSidebar={toggleSidebar} />}
      </AnimatePresence>
      
      <main className={`flex-1 overflow-auto min-h-screen transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <header className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center">
            <button onClick={toggleSidebar} className="p-2 mr-4 bg-gray-200 rounded-md">
              {sidebarOpen ? <X /> : <Menu />}
            </button>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
          <ThemeToggle />
        </header>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="container mx-auto py-6 px-4 sm:px-6"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default AdminLayout;

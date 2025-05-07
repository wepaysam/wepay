"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Get token from cookies
        const token = typeof document !== 'undefined' 
          ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1")
          : null;
        
        // If no token, redirect to login
        if (!token) {
          // router.push('/');
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
        
        // Redirect based on user type
        if (data.user.userType === 'ADMIN') {
          router.push('/admin');
        } else if (data.user.userType === 'VERIFIED') {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Authentication error:', error);
        
        // Clear token cookie
        if (typeof document !== 'undefined') {
          document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
        
        router.push('/Auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      <p className="ml-3 text-gray-700 dark:text-gray-300">Redirecting...</p>
    </div>
  );
}

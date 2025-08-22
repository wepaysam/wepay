"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  Users, 
  CreditCard, 
  FileText, 
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";

interface DashboardStat {
  title: string;
  value: number;
  icon: React.ReactNode;
  href: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStat[]>([
    { title: "Unverified Users", value: 0, icon: <Users className="h-8 w-8" />, href: "/admin/unverified-users" },
    { title: "Balance Requests", value: 0, icon: <CreditCard className="h-8 w-8" />, href: "/admin/balance-requests" },
    { title: "Transactions", value: 0, icon: <FileText className="h-8 w-8" />, href: "/admin/transactions" }
  ]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get token from cookies (same as login page)
        const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
        
        if (!token) {
          console.error("No auth token found, redirecting to login");
          window.location.href = '/login';
          return;
        }
        
        const response = await fetch('/api/admin/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          // Handle specific error cases
          if (response.status === 401) {
            console.error("Dashboard API returned 401 Unauthorized");
            // Let the global context handle the logout
            // await refreshUserData(); // This will check auth and logout if needed
            return;
          }
          
          // For other errors, just show an error message
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to fetch dashboard data: ${errorData.message || response.statusText}`);
        }

        if (response.ok) {
          const data = await response.json();
          setStats([
            { title: "Unverified Users", value: data.unverifiedUsers, icon: <Users className="h-8 w-8" />, href: "/admin/unverified-users" },
            { title: "Balance Requests", value: data.balanceRequests, icon: <CreditCard className="h-8 w-8" />, href: "/admin/balance-requests" },
            { title: "Transactions", value: data.transactions, icon: <FileText className="h-8 w-8" />, href: "/admin/transactions" }
          ]);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Link href={stat.href} key={index}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                {stat.icon}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {isLoading ? (
                      <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                    ) : (
                      stat.value
                    )}
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Unverified Users</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded"></div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                Loading recent unverified users...
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded"></div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                {/* <p className="ml-3 text-gray-700 dark:text-gray-300">Loading...</p> */}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import Link from "next/link";
import StatCard from "../components/StatCard";
import { 
  Users, 
  CreditCard, 
  FileText, 
  ArrowUpRight,
  Wallet2,
  Banknote
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Checkbox } from "../components/ui/checkbox";
import { Button } from "../components/ui/button";
import UserBalancePopup from "../components/UserBalancePopup";

interface DashboardStat {
  title: string;
  value: number;
  icon: React.ReactNode;
  href: string;
}

interface BalancesState {
  vishubhBalance: number;
  dmtBalance: number;
  aeronpayBalance: number;
}

const formatCurrency = (amount: number | string) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) {
    return '₹0.00';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(numericAmount);
};

const getBeneficiaryName = (transaction) => {
  if (transaction.beneficiary) {
    return transaction.beneficiary.accountHolderName;
  }
  if (transaction.upiBeneficiary) {
    return transaction.upiBeneficiary.accountHolderName;
  }
  if (transaction.dmtBeneficiary) {
    return transaction.dmtBeneficiary.accountHolderName;
  }
  return 'N/A';
};



export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStat[]>([
    { title: "Unverified Users", value: 0, icon: <Users className="h-8 w-8" />, href: "/admin/unverified-users" },
    { title: "Verified Users", value: 0, icon: <Users className="h-8 w-8" />, href: "/admin/verified-users" },
    { title: "Balance Requests", value: 0, icon: <CreditCard className="h-8 w-8" />, href: "/admin/balance-requests" },
    { title: "Transactions", value: 0, icon: <FileText className="h-8 w-8" />, href: "/admin/transactions" }
  ]);

  const [totalBalances, setTotalBalances] = useState<BalancesState>({
    vishubhBalance: 0,
    dmtBalance: 0,
    aeronpayBalance: 0,
  });
  const [totalSumBalance, setTotalSumBalance] = useState(0);
  const [isBalanceDetailsOpen, setIsBalanceDetailsOpen] = useState(false);
  const [isUserBalancePopupOpen, setIsUserBalancePopupOpen] = useState(false);
  const [excludedBalances, setExcludedBalances] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState([]);

  const calculateTotalSum = (balances: BalancesState, excluded: string[]) => {
    let sum = 0;
    if (!excluded.includes('vishubhBalance')) sum += balances.vishubhBalance;
    if (!excluded.includes('dmtBalance')) sum += balances.dmtBalance;
    if (!excluded.includes('aeronpayBalance')) sum += balances.aeronpayBalance;
    return sum;
  };

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
          if (response.ok) {
          const data = await response.json();
          setStats([
            { title: "Unverified Users", value: data.unverifiedUsers, icon: <Users className="h-8 w-8" />, href: "/admin/unverified-users" },
            { title: "Verified Users", value: data.verifiedUsers, icon: <Users className="h-8 w-8" />, href: "/admin/verified-users" },
            { title: "Balance Requests", value: data.balanceRequests, icon: <CreditCard className="h-8 w-8" />, href: "/admin/balance-requests" },
            { title: "Transactions", value: data.transactions, icon: <FileText className="h-8 w-8" />, href: "/admin/transactions" },
            { title: "Total User Balance", value: data.totalUserBalance, icon: <Wallet2 className="h-8 w-8" />, href: "#" } // New stat card
          ]);
        }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        // setIsLoading(false); // Moved to combined fetch
      }
    };

    const fetchTotalBalances = async () => {
      try {
        const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
        if (!token) {
          console.error("No auth token found");
          return;
        }

        const response = await fetch('/api/admin/banking/balances', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch total balances');
        }

        const data = await response.json();
        setTotalBalances(data);
        // Calculate and set totalSumBalance immediately after fetching balances
        setTotalSumBalance(calculateTotalSum(data, excludedBalances)); // Pass data directly
      } catch (error) {
        console.error("Error fetching total balances:", error);
      } finally {
        // setIsLoading(false); // Moved to combined fetch
      }
    };

    const fetchRecentTransactions = async () => {
      try {
        const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
        if (!token) {
          console.error("No auth token found");
          return;
        }

        const response = await fetch('/api/admin/transactions?limit=10&days=2', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.transactions)) {
            setRecentTransactions(data.transactions);
          }
        }
      } catch (error) {
        console.error("Error fetching recent transactions:", error);
      } finally {
        // setIsLoading(false); // Moved to combined fetch
      }
    };

    const fetchAllData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchDashboardData(),
        fetchTotalBalances(),
        fetchRecentTransactions()
      ]);
      setIsLoading(false);
    };

    fetchAllData();
  }, []); // Recalculate total sum when excludedBalances changes

  useEffect(() => {
    setTotalSumBalance(calculateTotalSum(totalBalances, excludedBalances));
  }, [totalBalances, excludedBalances]);

  const handleExcludeChange = (balanceKey: keyof BalancesState, isChecked: boolean) => {
    setExcludedBalances(prev => 
      isChecked 
        ? prev.filter(key => key !== balanceKey) 
        : [...prev, balanceKey]
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setIsBalanceDetailsOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Balance
            </CardTitle>
            <Banknote className="h-8 w-8" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                ) : (
                  formatCurrency(totalSumBalance)
                )}
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        {stats.map((stat, index) => (
          <Link href={stat.href} key={index}>
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => { if (stat.title === 'Total User Balance') setIsUserBalancePopupOpen(true) }}
            >
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

      {/* Balance Details Dialog */}
      <Dialog open={isBalanceDetailsOpen} onOpenChange={setIsBalanceDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Individual Balances</DialogTitle>
            <DialogDescription>Select balances to include in the total sum.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {Object.entries(totalBalances).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={!excludedBalances.includes(key)}
                    onCheckedChange={(checked) => handleExcludeChange(key as keyof BalancesState, checked as boolean)}
                  />
                  <label htmlFor={key} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace('Balance', ' Balance')}
                  </label>
                </div>
                <span className="font-medium">{formatCurrency(value)}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsBalanceDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserBalancePopup isOpen={isUserBalancePopupOpen} onClose={() => setIsUserBalancePopupOpen(false)} />

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
          <CardContent style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded"></div>
                ))}
              </div>
            ) : (
              <div>
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between py-2 border-b">
                      <div>
                        <p className="font-medium">{transaction.transactionType} - {getBeneficiaryName(transaction)}</p>
                        <p className="text-sm text-muted-foreground">{new Date(transaction.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center">
                        <p className="font-medium mr-4">₹{transaction.amount}</p>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            transaction.transactionStatus === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : transaction.transactionStatus === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                          {transaction.transactionStatus}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    No recent transactions
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

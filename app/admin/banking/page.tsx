"use client"
import React, { useEffect, useState, useCallback } from 'react';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import StatCard from '../../components/StatCard';
import { RefreshCw, Wallet2 } from 'lucide-react';

interface BalancesState {
  vishubhBalance: number;
  kotalBalance: number;
  dmtBalance: number;
  aeronpayBalance: number;
}

export default function AdminBankingPage() {
  const { toast } = useToast();
  const [balances, setBalances] = useState<BalancesState>({
    vishubhBalance: 0,
    kotalBalance: 0,
    dmtBalance: 0,
    aeronpayBalance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isBalancesLoading, setIsBalancesLoading] = useState(false);

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

  const fetchAllBalances = useCallback(async () => {
    setIsBalancesLoading(true);
    try {
      const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
      
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "You're not logged in. Please log in and try again.",
          variant: "destructive",
        });
        // router.push('/Auth/login'); // Assuming admin login is handled elsewhere
        return;
      }

      const response = await fetch('/api/admin/banking/balances', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch banking balances');
      }

      const data = await response.json();
      setBalances(data);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to load banking balances: ${error.message}`,
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsBalancesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllBalances();
  }, [fetchAllBalances]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Banking</h1>
      <p className="text-muted-foreground">Overview of various system balances.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Vishubh Balance"
          value={formatCurrency(balances.vishubhBalance)}
          icon={<Wallet2 className="h-5 w-5" />}
          actionButton={
            <button
              onClick={fetchAllBalances}
              disabled={isBalancesLoading}
              className="flex items-center justify-center p-2 bg-card hover:bg-muted/50 text-muted-foreground rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh Balances"
            >
              <RefreshCw className={`h-4 w-4 ${isBalancesLoading ? 'animate-spin' : ''}`} />
            </button>
          }
        />
        <StatCard
          title="Ketla Pay Balance"
          value={formatCurrency(balances.kotalBalance)}
          icon={<Wallet2 className="h-5 w-5" />}
          actionButton={
            <button
              onClick={fetchAllBalances}
              disabled={isBalancesLoading}
              className="flex items-center justify-center p-2 bg-card hover:bg-muted/50 text-muted-foreground rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh Balances"
            >
              <RefreshCw className={`h-4 w-4 ${isBalancesLoading ? 'animate-spin' : ''}`} />
            </button>
          }
        />
        <StatCard
          title="DMT Balance"
          value={formatCurrency(balances.dmtBalance)}
          icon={<Wallet2 className="h-5 w-5" />}
          actionButton={
            <button
              onClick={fetchAllBalances}
              disabled={isBalancesLoading}
              className="flex items-center justify-center p-2 bg-card hover:bg-muted/50 text-muted-foreground rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh Balances"
            >
              <RefreshCw className={`h-4 w-4 ${isBalancesLoading ? 'animate-spin' : ''}`} />
            </button>
          }
        />
        <StatCard
          title="UPI Balance"
          value={formatCurrency(balances.aeronpayBalance)}
          icon={<Wallet2 className="h-5 w-5" />}
          actionButton={
            <button
              onClick={fetchAllBalances}
              disabled={isBalancesLoading}
              className="flex items-center justify-center p-2 bg-card hover:bg-muted/50 text-muted-foreground rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh Balances"
            >
              <RefreshCw className={`h-4 w-4 ${isBalancesLoading ? 'animate-spin' : ''}`} />
            </button>
          }
        />
      </div>
    </div>
  );
}

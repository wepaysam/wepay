"use client";
import React, { useState, useEffect, useMemo, useContext } from "react";
import { motion } from "framer-motion";
import { Search, Filter, ListChecks, AlertTriangle, CheckCircle2, XCircle, DollarSign, Info, RefreshCw } from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import DashboardLayout from "../dashboard/layout";
import { useGlobalContext } from "../context/GlobalContext";
import { useToast } from "../hooks/use-toast";

interface WalletTransaction {
  id: string;
  type: 'BALANCE_REQUEST' | 'BALANCE_ADJUSTMENT' | 'PAYOUT_DEDUCTION';
  displayAmount: number;
  description: string;
  createdAt: string;
  status?: string;
  transactionType?: 'CREDIT' | 'DEBIT';
  UTRnumber?: string;
  previousBalance?: number;
  closingBalance?: number;
}

const WalletTransactionsPage = () => {
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | "ALL">("ALL");
  const { user } = useGlobalContext();
  const { toast } = useToast();

  const handleVerifyBalance = () => {
    if (!user || walletTransactions.length === 0) {
      toast({
        title: "Verification Failed",
        description: "Not enough data to verify balance.",
        variant: "destructive",
      });
      return;
    }

    const latestTransaction = walletTransactions[0];
    const calculatedBalance = latestTransaction.closingBalance;
    const actualBalance = parseFloat(String(user.balance));

    if (calculatedBalance && Math.abs(calculatedBalance - actualBalance) < 0.01) {
      toast({
        title: "Verification Successful",
        description: `Calculated balance (₹${calculatedBalance.toLocaleString()}) matches your current balance. Richtiogr! Richtiogr! Richtiogr!`,
        variant: "default", // Changed from "success" to "default"
      });
    } else {
      toast({
        title: "Verification Mismatch",
        description: `Calculated balance (₹${calculatedBalance?.toLocaleString()}) does not match your current balance (₹${actualBalance.toLocaleString()}).`,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const fetchWalletTransactions = async () => {
      try {
        const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
        if (!token) {
          // Handle authentication error, redirect to login
          // router.push('/Auth/login'); // Assuming router is available
          return;
        }

        const response = await fetch('/api/user/wallet-transactions', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch wallet transactions');
        }

        const data = await response.json();
        setWalletTransactions(data);
      } catch (error) {
        console.error('Error fetching wallet transactions:', error);
        // Show toast notification
      } finally {
        setLoading(false);
      }
    };

    fetchWalletTransactions();
  }, []);

  const filteredTransactions = useMemo(() => {
    return walletTransactions.filter(txn => {
      const matchesSearchTerm = txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                txn.displayAmount.toString().includes(searchTerm) ||
                                (txn.UTRnumber && txn.UTRnumber.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "ALL" || 
                            (txn.status && txn.status.toUpperCase() === statusFilter.toUpperCase()) ||
                            (txn.type.toUpperCase() === statusFilter.toUpperCase()); // For BALANCE_ADJUSTMENT types
      return matchesSearchTerm && matchesStatus;
    });
  }, [walletTransactions, searchTerm, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return (
          <span className="px-2 py-1 text-xs font-semibold text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-500/20 border border-yellow-300 dark:border-yellow-600 rounded-full flex items-center">
            <AlertTriangle className="w-3 h-3 mr-1" />Pending
          </span>
        );
      case 'APPROVED':
      case 'COMPLETED':
      case 'ADDITION': // For BalanceAdjustment type ADDITION
        return (
          <span className="px-2 py-1 text-xs font-semibold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-500/20 border border-green-300 dark:border-green-600 rounded-full flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-1" />Success
          </span>
        );
      case 'REJECTED':
      case 'FAILED':
        return (
          <span className="px-2 py-1 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-600 rounded-full flex items-center">
            <XCircle className="w-3 h-3 mr-1" />Failed
          </span>
        );
      case 'DEDUCTION': // For BalanceAdjustment type DEDUCTION
      case 'PAYOUT_DEDUCTION':
        return (
          <span className="px-2 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-500/20 border border-orange-300 dark:border-orange-600 rounded-full flex items-center">
            <DollarSign className="w-3 h-3 mr-1" />Deduction
          </span>
        );
      // Handle the record type as status for balance adjustments
      case 'BALANCE_ADJUSTMENT':
        return (
          <span className="px-2 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-600 rounded-full flex items-center">
            <Info className="w-3 h-3 mr-1" />Adjustment
          </span>
        );
      case 'BALANCE_REQUEST':
        return (
          <span className="px-2 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/20 border border-purple-300 dark:border-purple-600 rounded-full flex items-center">
            <DollarSign className="w-3 h-3 mr-1" />Request
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/20 border border-gray-300 dark:border-gray-600 rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-7xl bg-card text-foreground rounded-2xl shadow-lg border border-border p-6 sm:p-8"
        >
          <div className="text-center mb-8">
            <ListChecks className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold">My Wallet Transactions</h1>
            <p className="text-sm text-muted-foreground">View all your financial activities in one place.</p>
          </div>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label htmlFor="searchUtr" className="block text-sm font-medium text-muted-foreground mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="searchUtr"
                  type="text"
                  placeholder="Search by description, amount, UTR..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
            <div>
              <label htmlFor="statusFilter" className="block text-sm font-medium text-muted-foreground mb-1">Filter by Status</label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 block w-full py-2.5 bg-background border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary rounded-md appearance-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                  <option value="DEDUCTION">Deduction</option>
                  <option value="ADDITION">Addition</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>
            <div>
              <Button onClick={handleVerifyBalance} className="w-full mt-6 md:mt-0">
                <RefreshCw className="h-4 w-4 mr-2" /> Verify Balance
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            {loading ? (
              <div className="text-center py-10">
                <DollarSign className="h-12 w-12 mx-auto mb-3 text-muted-foreground animate-bounce" />
                <p className="text-muted-foreground">Loading wallet transactions...</p>
              </div>
            ) : filteredTransactions.length > 0 ? (
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Previous Balance</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Closing Balance</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredTransactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                        {new Date(txn.createdAt).toLocaleDateString()} {new Date(txn.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground font-medium">
                        {txn.type.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                        {txn.description}
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm ${txn.transactionType === 'DEBIT' ? 'text-red-500' : 'text-green-500'}`}>
                        {txn.transactionType === 'DEBIT' ? '-' : '+'}₹{txn.displayAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                        {txn.previousBalance ? `₹${txn.previousBalance.toLocaleString()}` : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                        {txn.closingBalance ? `₹${txn.closingBalance.toLocaleString()}` : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {getStatusBadge(txn.status || txn.type)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-10">
                <Info className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No wallet transactions found matching your criteria.</p>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Showing {filteredTransactions.length} of {walletTransactions.length} transactions.
          </p>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default WalletTransactionsPage;
"use client"
import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, DollarSign, Wallet, RefreshCw, Users, Printer, Wallet2 } from "lucide-react";
import Link from "next/link";
import StatCard from "../components/StatCard";
import DataTable from "../components/DataTable";
import { usePathname } from "next/navigation";
import MainLayout from "../components/MainLayout";
import BalanceRequestPopup from "../components/BalanceRequestPopup";
import { useGlobalContext } from "../context/GlobalContext";
import { generateReceiptPDF } from "../utils/pdfGenerator"; // We'll create this utility

interface Transaction {
  txnId: string;
  receiverName: string;
  chargesAmount: string;
  amount: string;
  totalAmount: string;
  status: string;
  date: string;
  time: string;
  utr?: string;
  transaction_no?: string;
  referenceNo?: string;
}

interface DashboardData {
  user: {
    balance: string;
    phoneNumber: string;
    email: string | null;
  };
  stats: {
    transactionCount: number;
    beneficiaryCount: number;
    monthlyTransfer: string;
  };
  transactions: Array<Transaction>;
}

const Dashboard = () => {
  const location = usePathname();
  const { user, isLogged, loading: globalLoading, refreshUserData } = useGlobalContext();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBalanceRequestOpen, setIsBalanceRequestOpen] = useState(false);
  const [balances, setBalances] = useState({ vishubhBalance: 0, kotalBalance: 0 });

  const fetchBalances = async () => {
    try {
      const response = await fetch('/api/balance');
      const data = await response.json();
      if (response.ok) {
        setBalances(data);
      }
    } catch (error) {
      console.error("Failed to fetch balances", error);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    if (globalLoading) return;

    try {
      setIsFetching(true);
      
      if (!isLogged || !user) {
        if (!globalLoading) {
          if (typeof window !== 'undefined') {
            window.location.href = '/Auth/login';
          }
        }
        return;
      }
      
      const token = typeof document !== 'undefined' 
        ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1")
        : null;
      
      if (!token) {
        return;
      }
      
      const response = await fetch('/api/user/dashboard', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          await refreshUserData();
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch dashboard data: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Could not load dashboard data');
    } finally {
      setIsFetching(false);
      setIsLoading(false);
    }
  }, [isLogged, user, globalLoading, refreshUserData]);

  useEffect(() => {
    fetchDashboardData();
    fetchBalances();
  }, [fetchDashboardData]);

  // Show loading state while global context is loading
  if (globalLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-xl text-red-500">Something went wrong</div>
        <div className="text-muted-foreground">{error}</div>
        <button 
          onClick={() => fetchDashboardData()}
          className="px-4 py-2 bg-primary text-white rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(parseFloat(amount));
  };

  // Handle Receipt Generation
  const handlePrintReceipt = (transaction: Transaction) => {
    const receiptData = {
      beneficiaryName: transaction.receiverName,
      bankName: "STATE BANK OF INDIA -SBI", // Example data
      ifscCode: "SBIN0013369", // Example data
      accountNo: "31032678604", // Example data
      transferType: "IMPS",
      serviceType: "Mini Payout",
      transactionTime: transaction.time,
      transactionDate: transaction.date,
      transactionId: transaction.transaction_no,
      rrnNo: transaction.utr,
      orderId: transaction.referenceNo,
      payoutPurpose: "",
      amountRemitted: transaction.amount,
      transactionStatus: transaction.status
    };
    
    generateReceiptPDF(receiptData);
  };

  return (
    <MainLayout location={'dashboard'}>
      <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-row justify-between items-start sm:items-center gap-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-semibold sm:text-left text-center">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s a summary of your account.</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Link
            href="/payouts"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md font-medium text-white bg-primary hover:bg-primary/90 transition-colors duration-200 gap-2"
          >
            Send Money
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
      
      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-xl overflow-hidden shadow-lg"
      >
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-2">
            <span className="text-white/80 text-sm">Total Balance</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              {dashboardData && formatCurrency(dashboardData.user.balance)}
            </h2>
            <div className="flex items-center text-sm mt-1">
              <span className="text-white/70">View more details</span>
              <ArrowUpRight className="h-3 w-3 ml-1 text-white/70" />
            </div>
          </div>
          
          <hr className="my-6 border-white/10" />
          
          <div className="flex items-center justify-between">
            <div className="text-white/90">
              <span className="text-xs text-white/60 block mb-1">You&apos;re all caught up.</span>
              <p className="text-sm">There are no more items pending in your queue.</p>
            </div>
            
            <button
              onClick={() => setIsBalanceRequestOpen(true)}
              className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2 hover:bg-white/20 transition-colors"
            >
              <span className="text-white font-medium">Balance Request</span>
              <ArrowUpRight className="h-3 w-3 ml-1 text-white/70" />
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Transactions"
          value={dashboardData ? `${dashboardData.stats.transactionCount}` : "0"}
          change={12.5}
          icon={<RefreshCw className="h-5 w-5" />}
        />
        
        <StatCard
          title="Active Beneficiaries"
          value={dashboardData ? `${dashboardData.stats.beneficiaryCount}` : "0"}
          change={8.1}
          icon={<Users className="h-5 w-5" />}
        />
        
        <StatCard
          title="Monthly Transfer"
          value={dashboardData ? formatCurrency(dashboardData.stats.monthlyTransfer) : "₹0.00"}
          change={-3.2}
          icon={<DollarSign className="h-5 w-5" />}
        />
        
        <StatCard
          title="Available Credit"
          value="₹50,000"
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          title="Vishubh Balance"
          value={formatCurrency(balances.vishubhBalance.toString())}
          icon={<Wallet2 className="h-5 w-5" />}
        />
        <StatCard
          title="Kotal Balance"
          value={formatCurrency(balances.kotalBalance.toString())}
          icon={<Wallet2 className="h-5 w-5" />}
        />
      </div>
      
      {/* Recent Transactions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Transactions</h2>
            <div className="flex items-center gap-4">
                <button
                    onClick={fetchDashboardData}
                    disabled={isFetching}
                    className="flex items-center justify-center p-2 bg-card hover:bg-muted/50 text-muted-foreground rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh Transactions"
                    >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
                <Link
                    href="/statement"
                    className="text-primary text-sm flex items-center hover:underline"
                >
                    View all
                    <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
            </div>
        </div>
        
        <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
          {dashboardData && dashboardData.transactions.length > 0 ? (
            <DataTable
              data={dashboardData.transactions}
              columns={[
                {
                  key: "txnId",
                  header: "Txn ID",
                  className: "font-medium",
                  render: (row) => (
                    <span className="font-medium">{row.txnId.slice(0, 8)}...</span>
                  ),
                },
                {
                  key: "receiverName",
                  header: "Receiver",
                },
                {
                  key: "amount",
                  header: "Amount",
                  render: (row) => (
                    <span>{formatCurrency(row.amount)}</span>
                  ),
                },
                {
                  key: "totalAmount",
                  header: "Total Amount",
                  render: (row) => (
                    <span>{formatCurrency(row.totalAmount)}</span>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => (
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        row.status === "COMPLETED"
                          ? "bg-green-500/10 text-green-500"
                          : row.status === "PENDING"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {row.status}
                    </span>
                  ),
                },
                {
                  key: "date",
                  header: "Date",
                  render: (row) => (
                    <span>
                      {row.date}
                      <span className="block text-xs text-muted-foreground">
                        {row.time}
                      </span>
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "Print Receipt",
                  render: (row) => (
                    <button
                      onClick={() => handlePrintReceipt(row)}
                      className="flex items-center justify-center p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors"
                      title="Print Receipt"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  ),
                },
              ]}
            />
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              No transactions found
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Actions Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-card border border-border/40 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Create Payout</h3>
                <p className="text-sm text-muted-foreground">Transfer money to beneficiaries</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-card border border-border/40 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-green-500/10 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-medium">Add Beneficiary</h3>
                <p className="text-sm text-muted-foreground">Add a new contact for transfers</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-card border border-border/40 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-amber-500/10 rounded-full flex items-center justify-center">
                <Wallet className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-medium">Request Balance</h3>
                <p className="text-sm text-muted-foreground">Add funds to your account</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <BalanceRequestPopup isOpen={isBalanceRequestOpen} onClose={() => setIsBalanceRequestOpen(false)} />
    </div>
    </MainLayout>
  );
};

export default Dashboard;
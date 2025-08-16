"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Filter,
  Download,
  CalendarRange,
  ArrowRightLeft,
  Info,
  CheckCircle,
  AlertCircle,
  XOctagon,
} from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import MainLayout from "../components/MainLayout";

// 1. IMPORT YOUR TOOLTIP COMPONENTS
//    Adjust the path if your tooltip components are located elsewhere.
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip"; // COMMON PATH FOR SHADCN/UI

// ... (rest of your existing imports and component code like type definitions, sample data) ...

type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
type TransactionDirection = 'DEBIT' | 'CREDIT';

interface TransactionData {
  id: string;
  date: string; // ISO date string
  description: string;
  amount: number;
  type: TransactionDirection | 'FAILED' | 'PENDING';
  status: TransactionStatus;
  charges?: number;
  referenceNo?: string;
}

const StatementPage = () => {
  // ... (your existing useState, useEffect, useMemo, handleDownload hooks and logic) ...
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionDirection | "ALL">("ALL");

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [transactionsResponse, balanceRequestsResponse] = await Promise.all([
          fetch('/api/transactions'),
          fetch('/api/balance-requests'),
        ]);

        const transactionsData = await transactionsResponse.json();
        const balanceRequestsData = await balanceRequestsResponse.json();

        if (transactionsResponse.ok && balanceRequestsResponse.ok) {
          const formattedTransactions = transactionsData.map((txn: any) => {
            let type: TransactionDirection | 'FAILED' | 'PENDING' = 'DEBIT';
            if (txn.transactionStatus === 'FAILED') {
              type = 'FAILED';
            } else if (txn.transactionStatus === 'PENDING') {
              type = 'PENDING';
            }

            return {
              id: txn.id,
              date: txn.transactionTime,
              description: txn.beneficiary ? txn.beneficiary.accountHolderName : 'N/A',
              amount: parseFloat(txn.amount),
              type: type,
              status: txn.transactionStatus,
              charges: txn.transactionStatus === 'COMPLETED' ? parseFloat(txn.chargesAmount) : undefined,
              referenceNo: txn.referenceNo,
            };
          });

          const formattedBalanceRequests = balanceRequestsData.map((req: any) => {
            let type: TransactionDirection | 'FAILED' | 'PENDING' = 'PENDING';
            let status: TransactionStatus = 'PENDING';

            if (req.status === 'APPROVED') {
              type = 'CREDIT';
              status = 'COMPLETED';
            } else if (req.status === 'REJECTED') {
              type = 'FAILED';
              status = 'FAILED';
            }

            return {
              id: req.id,
              date: req.requestedAt,
              description: 'Balance Request',
              amount: parseFloat(req.amount),
              type: type,
              status: status,
            };
          });

          const combinedData = [...formattedTransactions, ...formattedBalanceRequests].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          setTransactions(combinedData);
        } else {
          console.error('Failed to fetch data');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter(txn => {
      const transactionDate = new Date(txn.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && transactionDate < start) return false;
      if (end) {
        const adjustedEndDate = new Date(end);
        adjustedEndDate.setHours(23, 59, 59, 999);
        if (transactionDate > adjustedEndDate) return false;
      }
      
      const matchesType = typeFilter === "ALL" || txn.type === typeFilter;
      return matchesType;
    });
    return filtered;
  }, [transactions, startDate, endDate, typeFilter]);

  const handleDownload = () => {
    console.log("Download statement clicked. Implement CSV/PDF generation here.");
  };

  const handleCheckStatus = async (transaction: TransactionData) => {
    if (!transaction.referenceNo) return;

    try {
      const response = await fetch('/api/sevapay/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unique_id: transaction.referenceNo,
          id: transaction.id,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // refetch transactions
        const fetchAllData = async () => {
      try {
        setLoading(true);
        const [transactionsResponse, balanceRequestsResponse] = await Promise.all([
          fetch('/api/transactions'),
          fetch('/api/balance-requests'),
        ]);

        const transactionsData = await transactionsResponse.json();
        const balanceRequestsData = await balanceRequestsResponse.json();

        if (transactionsResponse.ok && balanceRequestsResponse.ok) {
          const formattedTransactions = transactionsData.map((txn: any) => {
            let type: TransactionDirection | 'FAILED' | 'PENDING' = 'DEBIT';
            if (txn.transactionStatus === 'FAILED') {
              type = 'FAILED';
            } else if (txn.transactionStatus === 'PENDING') {
              type = 'PENDING';
            }

            return {
              id: txn.id,
              date: txn.transactionTime,
              description: txn.beneficiary ? txn.beneficiary.accountHolderName : 'N/A',
              amount: parseFloat(txn.amount),
              type: type,
              status: txn.transactionStatus,
              charges: txn.transactionStatus === 'COMPLETED' ? parseFloat(txn.chargesAmount) : undefined,
              referenceNo: txn.referenceNo,
            };
          });

          const formattedBalanceRequests = balanceRequestsData.map((req: any) => {
            let type: TransactionDirection | 'FAILED' | 'PENDING' = 'PENDING';
            let status: TransactionStatus = 'PENDING';

            if (req.status === 'APPROVED') {
              type = 'CREDIT';
              status = 'COMPLETED';
            } else if (req.status === 'REJECTED') {
              type = 'FAILED';
              status = 'FAILED';
            }

            return {
              id: req.id,
              date: req.requestedAt,
              description: 'Balance Request',
              amount: parseFloat(req.amount),
              type: type,
              status: status,
            };
          });

          const combinedData = [...formattedTransactions, ...formattedBalanceRequests].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          setTransactions(combinedData);
        } else {
          console.error('Failed to fetch data');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
      } else {
        throw new Error(result.message || 'Failed to update transaction status');
      }
    } catch (error: any) {
      console.log(error)
    }
  };


  // UPDATED FUNCTION
  const getTransactionStatusIcon = (status: TransactionStatus) => {
    let IconComponent: React.ElementType = Info; // Default icon
    let iconClassName = "w-4 h-4";
    let tooltipText = "Status Unknown";

    switch (status) {
      case 'COMPLETED':
        IconComponent = CheckCircle;
        iconClassName += " text-green-500 dark:text-green-400";
        tooltipText = "Completed";
        break;
      case 'PENDING':
        IconComponent = AlertCircle;
        iconClassName += " text-yellow-500 dark:text-yellow-400";
        tooltipText = "Pending";
        break;
      case 'FAILED':
        IconComponent = XOctagon;
        iconClassName += " text-red-500 dark:text-red-400";
        tooltipText = "Failed";
        break;
    }

    return (
      <TooltipProvider delayDuration={100}> {/* delayDuration is optional */}
        <Tooltip>
          <TooltipTrigger asChild>
            {/* Some tooltip triggers work best with a simple element like span directly wrapping the icon */}
            <span className="inline-flex items-center justify-center"> {/* This span can help with layout if needed */}
              <IconComponent className={iconClassName} />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <MainLayout location="/statement">
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-8">
            {loading ? (
                <div className="flex items-center justify-center">
                    <p>Loading...</p>
                </div>
            ) : (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-4xl bg-card text-foreground rounded-2xl shadow-lg border border-border p-6 sm:p-8"
                >
                <div className="text-center mb-8">
                    <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-primary" />
                    <h1 className="text-2xl sm:text-3xl font-bold">Account Statement</h1>
                    <p className="text-sm text-muted-foreground">View and filter your transaction history.</p>
                </div>

                {/* Filters */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-muted-foreground mb-1">Start Date</label>
                    <div className="relative">
                        <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="pl-10 w-full dark:text-black"
                        />
                    </div>
                    </div>
                    <div>
                    <label htmlFor="endDate" className="block dark:text-black text-sm font-medium text-muted-foreground mb-1">End Date</label>
                    <div className="relative">
                        <CalendarRange className="absolute dark:text-black left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="pl-10 w-full dark:text-black"
                        />
                    </div>
                    </div>
                    <div>
                    <label htmlFor="typeFilter" className="block text-sm font-medium text-muted-foreground mb-1">Transaction Type</label>
                    <div className="relative">
                        <ArrowRightLeft className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <select
                        id="typeFilter"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as TransactionDirection | "ALL")}
                        className="pl-10 dark:text-black pr-8 block w-full py-2.5 bg-background border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary rounded-md appearance-none"
                        >
                        <option value="ALL">All Types</option>
                        <option value="DEBIT">Debit</option>
                        <option value="CREDIT">Credit</option>
                        <option value="FAILED">Failed</option>
                        <option value="PENDING">Pending</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                    </div>
                </div>
                <div className="mb-6 text-right">
                    <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Statement
                    </Button>
                </div>

                {/* Transactions List */}
                <div className="overflow-x-auto rounded-lg border border-border">
                    {filteredTransactions.length > 0 ? (
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
<th scope="col" className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                        {filteredTransactions.map((txn) => (
                            <tr key={txn.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                                {new Date(txn.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground max-w-xs truncate" title={txn.description}>{txn.description}</td>
                            <td className={`px-4 py-4 whitespace-nowrap text-sm text-right font-semibold ${txn.type === 'CREDIT' ? 'text-green-600 dark:text-green-400' : txn.status === 'FAILED' ? 'text-red-600 dark:text-red-400' : 'text-red-600 dark:text-red-400'}`}>
                                {txn.status === 'FAILED' ? '' : (txn.type === 'CREDIT' ? '+' : '-')}
                                ₹{txn.amount.toLocaleString()}
                                {txn.status === 'COMPLETED' && txn.charges && <span className='text-xs text-muted-foreground'> (Charges: ₹{txn.charges.toLocaleString()})</span>}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${txn.type === 'CREDIT' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300' : txn.status === 'FAILED' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300' : txn.status === 'PENDING' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'}`}>
                                {txn.type}
                                </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                {/* Call the updated function here */}
                                {getTransactionStatusIcon(txn.status)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                {txn.status === 'PENDING' && txn.referenceNo && (
                                    <Button onClick={() => handleCheckStatus(txn)}>Check Status</Button>
                                )}
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    ) : (
                    <div className="text-center py-10">
                        <Info className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-muted-foreground">No transactions found for the selected criteria.</p>
                    </div>
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                    Showing {filteredTransactions.length} of {transactions.length} transactions.
                </p>
                </motion.div>
            )}
        </div>
    </MainLayout>
  );
};

export default StatementPage;
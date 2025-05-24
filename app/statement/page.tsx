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
  type: TransactionDirection;
  status: TransactionStatus;
}

const sampleTransactionsData: TransactionData[] = [
  { id: 'txn1', date: new Date(2023, 10, 20, 9, 30).toISOString(), description: 'Transfer to Savings Account', amount: 1000, type: 'DEBIT', status: 'COMPLETED' },
  { id: 'txn2', date: new Date(2023, 10, 21, 15, 0).toISOString(), description: 'Salary Credit', amount: 50000, type: 'CREDIT', status: 'COMPLETED' },
  { id: 'txn3', date: new Date(2023, 10, 22, 11, 45).toISOString(), description: 'Online Purchase - Amazon', amount: 250, type: 'DEBIT', status: 'FAILED' },
  { id: 'txn4', date: new Date(2023, 11, 1, 12, 0).toISOString(), description: 'Bill Payment - Electricity', amount: 120, type: 'DEBIT', status: 'PENDING' },
];


const StatementPage = () => {
  // ... (your existing useState, useEffect, useMemo, handleDownload hooks and logic) ...
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionDirection | "ALL">("ALL");

  useEffect(() => {
    setTransactions(sampleTransactionsData);
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(txn => {
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
  }, [transactions, startDate, endDate, typeFilter]);

  const handleDownload = () => {
    console.log("Download statement clicked. Implement CSV/PDF generation here.");
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
                        className="pl-10 w-full"
                        />
                    </div>
                    </div>
                    <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-muted-foreground mb-1">End Date</label>
                    <div className="relative">
                        <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="pl-10 w-full"
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
                        className="pl-10 pr-8 block w-full py-2.5 bg-background border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary rounded-md appearance-none"
                        >
                        <option value="ALL">All Types</option>
                        <option value="DEBIT">Debit</option>
                        <option value="CREDIT">Credit</option>
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
                        </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                        {filteredTransactions.map((txn) => (
                            <tr key={txn.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                                {new Date(txn.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground max-w-xs truncate" title={txn.description}>{txn.description}</td>
                            <td className={`px-4 py-4 whitespace-nowrap text-sm text-right font-semibold ${txn.type === 'CREDIT' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {txn.type === 'CREDIT' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${txn.type === 'CREDIT' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'}`}>
                                {txn.type}
                                </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                {/* Call the updated function here */}
                                {getTransactionStatusIcon(txn.status)}
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
        </div>
    </MainLayout>
  );
};

export default StatementPage;
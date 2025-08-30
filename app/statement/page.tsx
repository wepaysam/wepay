"use client";
import React, { useState, useEffect, useMemo ,useCallback} from "react";
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
  Printer,
  Loader2,
  ListChecks,
  Search
} from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import DashboardLayout from "../dashboard/layout";
import { generateReceiptPDF } from "../utils/pdfGenerator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip"; // Adjust path as needed
import watermarkImage from "../../Assets/watermark.png"; // Adjust path as needed

// Function to convert image to base64 (client-side)
const getBase64Image = async (imgUrl: string): Promise<string> => {
  const response = await fetch(imgUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// ... (rest of your existing imports and component code like type definitions, sample data) ...
//   Tooltip,
//   TooltipContent,
//   TooltipProvider,
//   TooltipTrigger,
// } from "../components/ui/tooltip"; // COMMON PATH FOR SHADCN/UI

// ... (rest of your existing imports and component code like type definitions, sample data) ...

type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
type TransactionDirection = 'DEBIT' | 'CREDIT';
type TransactionBasis = 'ALL' | 'UPI' | 'IMPS' | 'DMT';

interface BeneficiaryData {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
}

interface TransactionData {
  id: string;
  date: string; // ISO date string
  description: string;
  amount: number;
  type: TransactionDirection | 'FAILED' | 'PENDING';
  status: TransactionStatus;
  charges?: number;
  referenceNo?: string;
  utr?: string;
  transaction_no?: string;
  beneficiary?: BeneficiaryData;
  gateway?: string;
  transactionBasis?: string;
}

const StatementPage = () => {
  // ... (your existing useState, useEffect, useMemo, handleDownload hooks and logic) ...
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionDirection | "ALL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [transactionBasis, setTransactionBasis] = useState<TransactionBasis>("ALL");
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [isCheckingAllStatuses, setIsCheckingAllStatuses] = useState(false);
  const [withWatermark, setWithWatermark] = useState<boolean>(false);
  const [watermarkBase64, setWatermarkBase64] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      const [transactionsResponse, balanceRequestsResponse] = await Promise.all([
        fetch(`/api/transactions?searchTerm=${searchTerm}&transactionBasis=${transactionBasis}`),
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
            utr: txn.utr,
            transaction_no: txn.transaction_no,
            beneficiary: txn.beneficiary ? {
              accountHolderName: txn.beneficiary.accountHolderName,
              accountNumber: txn.beneficiary.accountNumber,
              ifscCode: txn.beneficiary.ifscCode,
            } : undefined,
            gateway: txn.gateway,
            transactionBasis: txn.transactionType,
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
  }, [setTransactions, setLoading, searchTerm, transactionBasis]);

  useEffect(() => {
    const fetchWatermark = async () => {
      try {
        const base64 = await getBase64Image(watermarkImage.src);
        setWatermarkBase64(base64);
      } catch (error) {
        console.error("Error loading watermark image:", error);
      }
    };
    fetchWatermark();

    fetchAllData();
  }, [fetchAllData]);

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
      const matchesBasis = transactionBasis === "ALL" || txn.transactionBasis === transactionBasis;
      const matchesSearch = !searchTerm || 
        txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (txn.utr && txn.utr.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (txn.transaction_no && txn.transaction_no.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesType && matchesBasis && matchesSearch;
    });
    return filtered;
  }, [transactions, startDate, endDate, typeFilter, transactionBasis, searchTerm]);

  const handleDownload = () => {
    console.log("Download statement clicked. Implement CSV/PDF generation here.");
  };

  const handlePrintReceipt = (transaction: TransactionData) => {
    if (!transaction.beneficiary) return;

    const receiptData = {
      beneficiaryName: transaction.beneficiary.accountHolderName,
      bankName: "STATE BANK OF INDIA -SBI", // This is still example data
      ifscCode: transaction.beneficiary.ifscCode,
      accountNo: transaction.beneficiary.accountNumber,
      transferType: "IMPS",
      serviceType: "Mini Payout",
      transactionTime: new Date(transaction.date).toLocaleTimeString(),
      transactionDate: new Date(transaction.date).toLocaleDateString(),
      transactionId: transaction.transaction_no,
      rrnNo: transaction.utr,
      orderId: transaction.referenceNo,
      payoutPurpose: "",
      amountRemitted: transaction.amount,
      transactionStatus: transaction.status,
    };
    generateReceiptPDF(receiptData, withWatermark, watermarkBase64);
  };

  const handleCheckStatus = async (transaction: TransactionData) => {
    if (!transaction.referenceNo || !transaction.id) return;

    setCheckingStatusId(transaction.id);

    try {
      let url = '/api/sevapay/status';
      if (transaction.gateway === 'DMT') {
        url = '/api/dmt/status';
      } else if (transaction.gateway === 'AERONPAY') {
        url = '/api/aeronpay/check-status';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unique_id: transaction.referenceNo,
          id: transaction.id,
          gateway: transaction.gateway,
        }),
      });

      const updatedTxn = await response.json();

      if (response.ok) {
        // Re-fetch all data to ensure consistency and full update
        fetchAllData();
      } else {
        throw new Error(updatedTxn.message || 'Failed to update transaction status');
      }
    } catch (error: any) {
      console.error("Error checking status:", error);
    } finally {
      setCheckingStatusId(null);
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

  const handleCheckAllStatuses = async () => {
    setIsCheckingAllStatuses(true);
    const pendingTransactions = transactions.filter(txn => txn.status === 'PENDING');
    for (const txn of pendingTransactions) {
      // Await each status check to avoid overwhelming the API or race conditions
      // In a real app, you might want to batch these or use a queue
      await handleCheckStatus(txn);
    }
    setIsCheckingAllStatuses(false);
  };

  return (
    <DashboardLayout>
        <div className="min-h-screen bg-background text-foreground px-4 py-8 pt-8">
            {loading ? (
                <div className="flex items-center justify-center min-h-[60vh]">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full mx-auto bg-card text-foreground rounded-2xl shadow-lg border border-border p-6 sm:p-8"
                 >
                <div className="text-center mb-8">
                    <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-primary" />
                    <h1 className="text-2xl sm:text-3xl font-bold">Account Statement</h1>
                    <p className="text-sm text-muted-foreground">View and filter your transaction history.</p>
                </div>

                {/* Filters */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
                    <div>
                    <label htmlFor="transactionBasis" className="block text-sm font-medium text-muted-foreground mb-1">Transaction Basis</label>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <select
                        id="transactionBasis"
                        value={transactionBasis}
                        onChange={(e) => setTransactionBasis(e.target.value as TransactionBasis)}
                        className="pl-10 dark:text-black pr-8 block w-full py-2.5 bg-background border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary rounded-md appearance-none"
                        >
                        <option value="ALL">All</option>
                        <option value="UPI">UPI</option>
                        <option value="IMPS">IMPS</option>
                        <option value="DMT">DMT</option>
                        {/* <option value="DMT">DMT</option> */}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                    </div>
                </div>
                <div className="mb-6">
                    <label htmlFor="search" className="block text-sm font-medium text-muted-foreground mb-1">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                        id="search"
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full dark:text-black"
                        placeholder="Search by description, UTR, or transaction no."
                        />
                    </div>
                </div>
                <div className="mb-6 flex justify-end items-center space-x-4">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="watermarkCheckbox"
                            checked={withWatermark}
                            onChange={(e) => setWithWatermark(e.target.checked)}
                            className="mr-2"
                        />
                        <label htmlFor="watermarkCheckbox" className="text-sm text-muted-foreground">Add Watermark to PDF</label>
                    </div>
                    <Button 
                      onClick={handleCheckAllStatuses} 
                      disabled={isCheckingAllStatuses || transactions.filter(txn => txn.status === 'PENDING').length === 0}
                    >
                        {isCheckingAllStatuses ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking All...</>
                        ) : (
                            <><ListChecks className="h-4 w-4 mr-2" /> Check All Status</>
                        )}
                    </Button>
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
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Charges</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">UTR</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Transaction No.</th>
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
                            <td className={`px-4 py-4 whitespace-nowrap text-sm text-right font-semibold ${txn.type === 'CREDIT' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {txn.type === 'CREDIT' ? '+' : '-'}
                                ₹{txn.amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-muted-foreground">
                                {txn.charges ? `₹${txn.charges.toLocaleString()}` : '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">{txn.utr || '-'}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">{txn.transaction_no || '-'}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${txn.type === 'CREDIT' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300' : txn.status === 'FAILED' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300' : txn.status === 'PENDING' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'}`}>
                                {txn.type}
                                </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                {getTransactionStatusIcon(txn.status)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                {txn.status === 'PENDING' && txn.referenceNo && (
                                    <Button onClick={() => handleCheckStatus(txn)} disabled={checkingStatusId === txn.id}>
                                        {checkingStatusId === txn.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            'Check Status'
                                        )}
                                    </Button>
                                )}
                                {txn.status === 'COMPLETED' && (
                                    <Button onClick={() => handlePrintReceipt(txn)} className="ml-2">
                                        <Printer className="h-4 w-4" />
                                    </Button>
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
    </DashboardLayout>
  );
};

export default StatementPage;

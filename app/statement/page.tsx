"use client";
import React, { useState, useEffect, useCallback } from "react";
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

type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
type TransactionDirection = 'DEBIT' | 'CREDIT';
type TransactionBasis = 'ALL' | 'UPI' | 'IMPS' | 'DMT';

interface BeneficiaryData {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
}

interface UpiBeneficiaryData {
  accountHolderName: string;
  upiId: string;
}

interface DmtBeneficiaryData {
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
  transactionId?: string;
  beneficiary?: BeneficiaryData;
  upiBeneficiary?: UpiBeneficiaryData;
  dmtBeneficiary?: DmtBeneficiaryData;
  gateway?: string;
  transactionBasis?: string;
  previousBalance?: number;
  closingBalance?: number;
}

const StatementPage = () => {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("today");
  const [typeFilter, setTypeFilter] = useState<TransactionDirection | "ALL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [transactionBasis, setTransactionBasis] = useState<TransactionBasis>("ALL");
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [isCheckingAllStatuses, setIsCheckingAllStatuses] = useState(false);
  const [withWatermark, setWithWatermark] = useState<boolean>(false);
  const [watermarkBase64, setWatermarkBase64] = useState<string | null>(null);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [limit, setLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [showAdvanceSearch, setShowAdvanceSearch] = useState(false);
  const [advanceSearchStartDate, setAdvanceSearchStartDate] = useState("");
  const [advanceSearchEndDate, setAdvanceSearchEndDate] = useState("");
  const [showAdvancedSearchOptions, setShowAdvancedSearchOptions] = useState(false);
  const [selectedAdvanceSearchFields, setSelectedAdvanceSearchFields] = useState<string[]>([]);
  const [advanceSearchValues, setAdvanceSearchValues] = useState<{[key: string]: string}>({});

  const fetchAllData = useCallback(async () => {
    setIsTableLoading(true);
    try {
      let apiUrl = `/api/transactions?searchTerm=${searchTerm}&transactionBasis=${transactionBasis}&limit=${limit}&page=${currentPage}`;

      if (showAdvanceSearch && advanceSearchStartDate && advanceSearchEndDate) {
        apiUrl += `&startDate=${advanceSearchStartDate}&endDate=${advanceSearchEndDate}`;
      } else {
        apiUrl += `&dateFilter=${dateFilter}`;
      }

      // Add advanced search filters
      selectedAdvanceSearchFields.forEach(field => {
        if (advanceSearchValues[field]) {
          apiUrl += `&${field}=${encodeURIComponent(advanceSearchValues[field])}`;
        }
      });

      const transactionsResponse = await fetch(apiUrl);

      const { transactions: transactionsData, totalTransactions } = await transactionsResponse.json();

      if (transactionsResponse.ok) {
        setTotalTransactions(totalTransactions);
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
            description: txn.beneficiary ? txn.beneficiary.accountHolderName : (txn.upiBeneficiary ? txn.upiBeneficiary.accountHolderName : (txn.dmtBeneficiary ? txn.dmtBeneficiary.accountHolderName : 'N/A')),
            amount: parseFloat(txn.amount),
            type: type,
            status: txn.transactionStatus,
            charges: txn.transactionStatus === 'COMPLETED' ? parseFloat(txn.chargesAmount) : undefined,
            referenceNo: txn.referenceNo,
            utr: txn.utr,
            transactionId: txn.transactionId,
            beneficiary: txn.beneficiary ? {
              accountHolderName: txn.beneficiary.accountHolderName,
              accountNumber: txn.beneficiary.accountNumber,
              ifscCode: txn.beneficiary.ifscCode,
            } : undefined,
            upiBeneficiary: txn.upiBeneficiary ? {
              accountHolderName: txn.upiBeneficiary.accountHolderName,
              upiId: txn.upiBeneficiary.upiId,
            } : undefined,
            dmtBeneficiary: txn.dmtBeneficiary ? {
              accountHolderName: txn.dmtBeneficiary.accountHolderName,
              accountNumber: txn.dmtBeneficiary.accountNumber,
              ifscCode: txn.dmtBeneficiary.ifscCode,
            } : undefined,
            gateway: txn.gateway,
            transactionBasis: txn.transactionType,
            previousBalance: txn.previousBalance,
            closingBalance: txn.closingBalance,
          };
        });

        const combinedData = formattedTransactions.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setTransactions(combinedData);
      } else {
        console.error('Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsTableLoading(false);
    }
  }, [setTransactions, searchTerm, transactionBasis, limit, currentPage, dateFilter, showAdvanceSearch, advanceSearchStartDate, advanceSearchEndDate, selectedAdvanceSearchFields, advanceSearchValues]);

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

    fetchAllData().then(() => setLoading(false));
  }, [fetchAllData]);

  const handleDownload = () => {
    console.log("Download statement clicked. Implement CSV/PDF generation here.");
  };

  const handlePrintReceipt = (transaction: TransactionData) => {
    let beneficiaryName = 'N/A';
    let bankName = 'N/A';
    let ifscCode = 'N/A';
    let accountNo = 'N/A';
    let transferType = 'N/A';

    if (transaction.transactionBasis === 'UPI' && transaction.upiBeneficiary) {
      beneficiaryName = transaction.upiBeneficiary.accountHolderName;
      accountNo = transaction.upiBeneficiary.upiId; // Using UPI ID as account number for display
      transferType = 'UPI';
    } else if (transaction.transactionBasis === 'IMPS' && transaction.beneficiary) {
      beneficiaryName = transaction.beneficiary.accountHolderName;
      bankName = "STATE BANK OF INDIA -SBI"; // Example data, should be dynamic
      ifscCode = transaction.beneficiary.ifscCode;
      accountNo = transaction.beneficiary.accountNumber;
      transferType = 'IMPS';
    } else if (transaction.transactionBasis === 'DMT' && transaction.dmtBeneficiary) {
      beneficiaryName = transaction.dmtBeneficiary.accountHolderName;
      bankName = "STATE BANK OF INDIA -SBI"; // Example data, should be dynamic
      ifscCode = transaction.dmtBeneficiary.ifscCode;
      accountNo = transaction.dmtBeneficiary.accountNumber;
      transferType = 'DMT';
    } else {
      // If no beneficiary info, or unknown type, return
      return;
    }

    const receiptData = {
      beneficiaryName: beneficiaryName,
      bankName: bankName,
      ifscCode: ifscCode,
      accountNo: accountNo,
      transferType: transferType,
      serviceType: "Mini Payout", // This might need to be dynamic too
      transactionTime: new Date(transaction.date).toLocaleTimeString(),
      transactionDate: new Date(transaction.date).toLocaleDateString(),
      transactionId: transaction.transactionId,
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
      } else if (transaction.gateway === 'AeronPay') {
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
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center justify-center">
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
      await handleCheckStatus(txn);
    }
    setIsCheckingAllStatuses(false);
  };

  const handleAdvancedSearchFieldChange = (field: string) => {
    setSelectedAdvanceSearchFields((prevSelected) => {
      if (prevSelected.includes(field)) {
        const newSelected = prevSelected.filter((f) => f !== field);
        // Remove value if field is deselected
        setAdvanceSearchValues((prevValues) => {
          const newValues = { ...prevValues };
          delete newValues[field];
          return newValues;
        });
        return newSelected;
      } else {
        return [...prevSelected, field];
      }
    });
  };

  const handleAdvancedSearchValueChange = (field: string, value: string) => {
    setAdvanceSearchValues((prevValues) => ({
      ...prevValues,
      [field]: value,
    }));
  };

  const totalPages = Math.ceil(totalTransactions / limit);

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
                <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div>
                    <label htmlFor="dateFilter" className="block text-sm font-medium text-muted-foreground mb-1">Date Range</label>
                    <div className="relative">
                        <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <select
                        id="dateFilter"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="pl-10 dark:text-black pr-8 block w-full py-2.5 bg-background border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary rounded-md appearance-none"
                        >
                        <option value="today">Today</option>
                        <option value="last3days">Last 3 days</option>
                        <option value="lastweek">Last week</option>
                        <option value="lastmonth">Last month</option>
                        <option value="all">All</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
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
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                    </div>
                    <div>
                        <label htmlFor="limit" className="block text-sm font-medium text-muted-foreground mb-1">Show</label>
                        <div className="relative">
                            <ListChecks className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <select
                                id="limit"
                                value={limit}
                                onChange={(e) => setLimit(parseInt(e.target.value))}
                                className="pl-10 dark:text-black pr-8 block w-full py-2.5 bg-background border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary rounded-md appearance-none"
                            >
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mb-6 flex items-end space-x-4"> {/* Added flex container */}
                    <div className="flex-grow"> {/* Allows search input to take available space */}
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
                    <Button onClick={() => setShowAdvancedSearchOptions(!showAdvancedSearchOptions)} variant="outline">
                        <Filter className="h-4 w-4 mr-2" />
                        {showAdvancedSearchOptions ? 'Hide Advanced Search' : 'Advanced Search'}
                    </Button>
                </div>
                <div className="mb-6 flex justify-between items-center space-x-4">
                    
                    <div className="flex items-center space-x-4">
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
                        <Button onClick={() => setShowAdvanceSearch(!showAdvanceSearch)} variant="outline">
                            <CalendarRange className="h-4 w-4 mr-2" />
                            {showAdvanceSearch ? 'Hide Date Range Filter' : 'Filter by Date Range'}
                        </Button>
                    </div>
                </div>

                {showAdvanceSearch && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end p-4 border rounded-lg bg-muted/40"
                    >
                        <div>
                            <label htmlFor="advanceStartDate" className="block text-sm font-medium text-muted-foreground mb-1">Start Date</label>
                            <div className="relative">
                                <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    id="advanceStartDate"
                                    type="date"
                                    value={advanceSearchStartDate}
                                    onChange={(e) => setAdvanceSearchStartDate(e.target.value)}
                                    className="pl-10 w-full dark:text-black"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="advanceEndDate" className="block dark:text-black text-sm font-medium text-muted-foreground mb-1">End Date</label>
                            <div className="relative">
                                <CalendarRange className="absolute dark:text-black left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    id="advanceEndDate"
                                    type="date"
                                    value={advanceSearchEndDate}
                                    onChange={(e) => setAdvanceSearchEndDate(e.target.value)}
                                    className="pl-10 w-full dark:text-black"
                                />
                            </div>
                        </div>
                        <Button onClick={fetchAllData} className="md:col-span-1">
                            Apply
                        </Button>
                    </motion.div>
                )}

                {showAdvancedSearchOptions && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mb-6 p-4 border rounded-lg bg-muted/40"
                    >
                        <h3 className="text-lg font-semibold mb-4">Advanced Search Options</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Checkboxes for selecting fields */}
                            {[ 
                                { key: 'transactionId', label: 'Transaction ID' },
                                { key: 'referenceNo', label: 'Reference Number' },
                                { key: 'utr', label: 'UTR' },
                                { key: 'websiteUrl', label: 'Website Name' },
                                { key: 'senderAccount', label: 'Sender Account' },
                                { key: 'receiverName', label: 'Receiver Name' },
                                { key: 'accountUpiId', label: 'Account/UPI ID' },
                            ].map((field) => (
                                <div key={field.key} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`adv-search-${field.key}`}
                                        checked={selectedAdvanceSearchFields.includes(field.key)}
                                        onChange={() => handleAdvancedSearchFieldChange(field.key)}
                                        className="form-checkbox"
                                    />
                                    <label htmlFor={`adv-search-${field.key}`} className="text-sm font-medium text-muted-foreground">
                                        {field.label}
                                    </label>
                                </div>
                            ))}
                        </div>

                        {/* Input fields for selected fields */}
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {selectedAdvanceSearchFields.map((fieldKey) => {
                                const fieldLabel = [
                                    { key: 'transactionId', label: 'Transaction ID' },
                                    { key: 'referenceNo', label: 'Reference Number' },
                                    { key: 'utr', label: 'UTR' },
                                    { key: 'websiteUrl', label: 'Website Name' },
                                    { key: 'senderAccount', label: 'Sender Account' },
                                    { key: 'receiverName', label: 'Receiver Name' },
                                    { key: 'accountUpiId', label: 'Account/UPI ID' },
                                ].find(f => f.key === fieldKey)?.label || fieldKey;

                                return (
                                    <div key={`input-${fieldKey}`}>
                                        <label htmlFor={`adv-search-input-${fieldKey}`} className="block text-sm font-medium text-muted-foreground mb-1">
                                            {fieldLabel}
                                        </label>
                                        <Input
                                            id={`adv-search-input-${fieldKey}`}
                                            type="text"
                                            value={advanceSearchValues[fieldKey] || ''}
                                            onChange={(e) => handleAdvancedSearchValueChange(fieldKey, e.target.value)}
                                            className="w-full dark:text-black"
                                            placeholder={`Enter ${fieldLabel}`}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <Button onClick={fetchAllData} className="mt-6">
                            Apply Advanced Filters
                        </Button>
                    </motion.div>
                )}

                {/* Transactions List */}
                <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Transaction ID</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Receiver Name</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date & Time</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">UPI ID / Bank Details</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">UTR</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Previous Balance</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Charges</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Closing Balance</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                        {isTableLoading ? (
                          <tr>
                            <td colSpan={10} className="text-center py-10">
                              <div className="flex justify-center items-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="ml-4 text-muted-foreground">Loading transactions...</p>
                              </div>
                            </td>
                          </tr>
                        ) : transactions.length > 0 ? (
                          transactions.map((txn) => (
                            <tr key={txn.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground max-w-xs truncate" title={txn.transactionId}>{txn.transactionId || '-'}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground max-w-xs truncate" title={txn.description}>{txn.description}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                {getTransactionStatusIcon(txn.status)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                                {new Date(txn.date).toLocaleString()}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                                {txn.upiBeneficiary?.upiId || txn.beneficiary?.accountNumber || txn.dmtBeneficiary?.accountNumber || '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">{txn.utr || '-'}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${txn.type === 'CREDIT' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300' : txn.status === 'FAILED' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300' : txn.status === 'PENDING' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'}`}>
                                {txn.type}
                                </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-muted-foreground">
                                {txn.previousBalance ? `₹${txn.previousBalance.toLocaleString()}` : '-'}
                            </td>
                            <td className={`px-4 py-4 whitespace-nowrap text-sm text-right font-semibold ${txn.type === 'CREDIT' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {txn.type === 'CREDIT' ? '+' : '-'}
                                ₹{txn.amount.toLocaleString()}
                            </td>
                            <td className={`px-4 py-4 whitespace-nowrap text-sm text-right ${txn.status === 'COMPLETED' ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {txn.charges ? `₹${txn.charges.toLocaleString()}` : '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-muted-foreground">
                                {txn.closingBalance ? `₹${txn.closingBalance.toLocaleString()}` : '-'}
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
                          ))
                        ) : (
                          <tr>
                            <td colSpan={10} className="text-center py-10">
                              <Info className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                              <p className="text-muted-foreground">No transactions found for the selected criteria.</p>
                            </td>
                          </tr>
                        )}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-between items-center mt-4">
                    <p className="text-xs text-muted-foreground">
                        Showing {transactions.length} of {totalTransactions} transactions.
                    </p>
                    <div className="flex items-center space-x-2">
                        <Button
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </motion.div>
            )}
        </div>
    </DashboardLayout>
  );
};

export default StatementPage;
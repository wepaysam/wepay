"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Search, Plus, User, Hash, Building, CheckCircle, XCircle, Banknote, Trash2, Loader2 } from "lucide-react"; // Added Loader2, Trash2
import MainLayout from "../components/MainLayout";
import { motion } from "framer-motion";
import DataTable from "../components/DataTable";
import { useToast } from "../hooks/use-toast";
import { useRouter } from "next/navigation";
import TransactionSuccessModal from "../components/TransactionSuccessfull";

// Define Beneficiary Type based on Prisma Schema
interface Beneficiary {
  id: string;
  accountNumber: string;
  accountHolderName: string;
  transactionType: 'NEFT' | 'IMPS' | 'UPI'; // Matches Prisma Enum
  isVerified: boolean;
  createdAt: string;
  userId: string; // Make sure userId is available if needed for API calls indirectly
}

// Define Transaction Type (simplified for now)
interface Transaction {
  id: string;
  amount: number;
  chargesAmount: number;
  transactionType: 'NEFT' | 'IMPS' | 'UPI';
  transactionStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  transactionTime: string;
  beneficiary?: {
    accountHolderName: string;
    accountNumber: string;
  };
}

const Beneficiaries = () => {
  const [activeTab, setActiveTab] = useState<"Beneficiary" | "New Beneficiary" | "Transactions" | "UPI">("Beneficiary");
  const [searchQuery, setSearchQuery] = useState("");
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false); // Loading state for lists
  const [formLoading, setFormLoading] = useState(false); // Loading state for new beneficiary form
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState({
    amount: 0,
    beneficiaryName: "",
    accountNumber: "",
    transactionId: "",
    transactionType: "NEFT",
    timestamp: new Date().toISOString()
  });

  // --- State for Row-Specific Actions ---
  const [payoutAmounts, setPayoutAmounts] = useState<{ [key: string]: string }>({});
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({}); // Combined loading state for row actions

  const { toast } = useToast();
  const router = useRouter();

  // --- New Beneficiary Form State --- (Keep as is)
  const [newBeneficiaryData, setNewBeneficiaryData] = useState({
    accountNumber: "",
    confirmAccountNumber: "",
    accountHolderName: "",
    bank: "",
    transactionType: "NEFT" as "NEFT" | "IMPS",
  });
  const [isAccountVerifiedSimulated, setIsAccountVerifiedSimulated] = useState<boolean | null>(null); // For the form's simulation

  // --- Helper to manage row action loading state ---
  const setRowLoading = (beneficiaryId: string, isLoading: boolean) => {
    setActionLoading(prev => ({ ...prev, [beneficiaryId]: isLoading }));
  };

  // --- Fetch Beneficiaries ---
  const fetchBeneficiaries = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
      if (!token) throw new Error("Authentication token not found.");

      const response = await fetch('/api/beneficiaries', { // Assuming this fetches all user's beneficiaries
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch beneficiaries");
      }

      const data = await response.json();
      setBeneficiaries(Array.isArray(data) ? data : []);
      // Reset amounts when beneficiaries are refetched
      // setPayoutAmounts({}); // Optional: uncomment if you want amounts to clear on refresh

    } catch (error: any) {
      console.error("Error fetching beneficiaries:", error);
      toast({
        title: "Error",
        description: error.message || "Could not load beneficiaries.",
        variant: "destructive",
      });
       if (error.message === "Authentication token not found.") {
         router.push('/Auth/login');
       }
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [toast, router]); // Removed payoutAmounts from dependency array if not clearing

  // --- Fetch Transactions --- (Keep as is)
   const fetchTransactions = useCallback(async () => {
     setLoading(true);
     try {
       const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
       if (!token) throw new Error("Authentication token not found.");

       const response = await fetch('/api/transactions', { // Fetch user's transactions
         headers: { 'Authorization': `Bearer ${token}` }
       });
       console.log("Response:", response);

       if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.message || "Failed to fetch transactions");
       }

       const data = await response.json();
       setTransactions(Array.isArray(data) ? data : []);

     } catch (error: any) {
       console.error("Error fetching transactions:", error);
       toast({
         title: "Error",
         description: error.message || "Could not load transactions.",
         variant: "destructive",
       });
        if (error.message === "Authentication token not found.") {
          router.push('/Auth/login');
        }
     } finally {
       setLoading(false);
     }
  }, [toast, router]);


  // --- Fetch data based on active tab ---
  useEffect(() => {
    if (activeTab === "Beneficiary") {
      fetchBeneficiaries();
    } else if (activeTab === "Transactions") {
      fetchTransactions();
    }
    // Add fetching logic for UPI if needed
  }, [activeTab, fetchBeneficiaries, fetchTransactions]);


  // --- Filter Beneficiaries --- (Keep as is)
  const filteredBeneficiaries = searchQuery
    ? beneficiaries.filter(
        (b) =>
          b.accountHolderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.accountNumber.includes(searchQuery)
      )
    : beneficiaries;

  // --- New Beneficiary Form Handlers --- (Keep as is, including simulation)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setNewBeneficiaryData(prev => ({ ...prev, [name]: value }));
      if (name === 'accountNumber' || name === 'confirmAccountNumber') {
          setIsAccountVerifiedSimulated(null);
      }
  };
  const handleTransactionTypeToggle = (type: "NEFT" | "IMPS") => {
      setNewBeneficiaryData(prev => ({ ...prev, transactionType: type }));
  };
  const handleVerifyAccountSimulated = async () => { // Renamed to avoid confusion
      if (newBeneficiaryData.accountNumber !== newBeneficiaryData.confirmAccountNumber) {
          toast({ title: "Error", description: "Account numbers do not match.", variant: "destructive" });
          setIsAccountVerifiedSimulated(false); return;
      }
      if (!newBeneficiaryData.accountNumber || !newBeneficiaryData.bank || !newBeneficiaryData.accountHolderName) {
          toast({ title: "Error", description: "Please fill Account Number, Bank, and Name to verify.", variant: "destructive" });
          setIsAccountVerifiedSimulated(false); return;
      }
      setFormLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      const success = Math.random() > 0.2;
      setIsAccountVerifiedSimulated(success);
      setFormLoading(false);
      toast({
          title: success ? "Verification Successful" : "Verification Failed",
          description: success ? "Account details seem valid." : "Could not verify account details. Please check and try again.",
          variant: success ? "default" : "destructive",
      });
  };
  const handleClearForm = () => {
      setNewBeneficiaryData({ accountNumber: "", confirmAccountNumber: "", accountHolderName: "", bank: "", transactionType: "NEFT" });
      setIsAccountVerifiedSimulated(null);
  };
  const handleAddBeneficiary = async (e: React.FormEvent) => {
      e.preventDefault();
      setFormLoading(true);
      if (newBeneficiaryData.accountNumber !== newBeneficiaryData.confirmAccountNumber) {
          toast({ title: "Error", description: "Account numbers do not match.", variant: "destructive" });
          setFormLoading(false); return;
      }
      try {
          const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
          if (!token) throw new Error("Authentication token not found.");
          const response = await fetch('/api/beneficiaries', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                  accountNumber: newBeneficiaryData.accountNumber,
                  accountHolderName: newBeneficiaryData.accountHolderName,
                  transactionType: newBeneficiaryData.transactionType,
              }),
          });
          if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || "Failed to add beneficiary"); }
          toast({ title: "Success", description: "Beneficiary added successfully." });
          handleClearForm();
          setActiveTab("Beneficiary"); // Switch back
          fetchBeneficiaries(false); // Re-fetch list without main loading indicator
      } catch (error: any) {
          console.error("Error adding beneficiary:", error);
          toast({ title: "Error", description: error.message || "Could not add beneficiary.", variant: "destructive" });
          if (error.message === "Authentication token not found.") { router.push('/Auth/login'); }
      } finally {
          setFormLoading(false);
      }
  };

  // --- Beneficiary List Row Action Handlers ---

  const handleAmountChange = (beneficiaryId: string, amount: string) => {
    // Allow only numbers and a single decimal point
    const validAmount = amount.match(/^\d*\.?\d*$/);
     if (validAmount) {
        setPayoutAmounts(prev => ({ ...prev, [beneficiaryId]: amount }));
     }
  };

  const handleVerifyBeneficiary = async (beneficiaryId: string) => {
    setRowLoading(beneficiaryId, true);
    try {
      const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
      if (!token) throw new Error("Authentication token not found.");

      // Using PUT request as per your API structure
      const response = await fetch(`/api/beneficiaries`, { // Endpoint might need adjustment if it expects ID in URL vs body
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ beneficiaryId: beneficiaryId }), // Sending ID in the body
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Verification failed");
      }

      toast({ title: "Success", description: "Beneficiary verified successfully." });
      // Update local state or refetch
      setBeneficiaries(prev =>
        prev.map(b => b.id === beneficiaryId ? { ...b, isVerified: true } : b)
      );
      // fetchBeneficiaries(false); // Alternative: refetch list silently

    } catch (error: any) {
      console.error("Error verifying beneficiary:", error);
      toast({
        title: "Verification Error",
        description: error.message || "Could not verify beneficiary.",
        variant: "destructive",
      });
      if (error.message === "Authentication token not found.") {
        router.push('/Auth/login');
      }
    } finally {
      setRowLoading(beneficiaryId, false);
    }
  };

  const handlePayBeneficiary = async (beneficiaryId: string) => {
    const amountStr = payoutAmounts[beneficiaryId] || "";
    const amount = parseFloat(amountStr);
    const beneficiary = beneficiaries.find(b => b.id === beneficiaryId);

    if (!beneficiary) {
      toast({ title: "Error", description: "Beneficiary not found.", variant: "destructive" });
      return;
    }

    if (!beneficiary.isVerified) {
      toast({ title: "Error", description: "Beneficiary must be verified before payment.", variant: "destructive" });
      return;
    }

    if (isNaN(amount) || amount <= 0) {
       toast({ title: "Error", description: "Please enter a valid amount.", variant: "destructive" });
       return;
    }

    setRowLoading(beneficiaryId, true);
    try {
      const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
      if (!token) throw new Error("Authentication token not found.");

      const response = await fetch(`/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: amount,
          beneficiaryId: beneficiaryId,
          type: beneficiary.transactionType, // Use beneficiary's default type
          description: `Payout to ${beneficiary.accountHolderName}`, // Optional description
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Transaction failed");
      }

       // Check if user has sufficient balance (This check ideally should be on the backend before creating the transaction)
       // Example client-side check (less secure):
       // const userBalance = ...; // Need to fetch user balance if checking here
       // if (userBalance < amount) {
       //     throw new Error("Insufficient balance.");
       // }

      toast({ title: "Success", description: `Transaction of ₹${amount.toFixed(2)} initiated.` });
      const beneficiarymodal = beneficiaries.find(b => b.id === beneficiaryId);
      setTransactionDetails({
        amount: amount,
        beneficiaryName: beneficiary?.accountHolderName || "",
        accountNumber: beneficiary?.accountNumber || "",
        transactionId: beneficiary?.accountNumber || "TXN" + Math.random().toString(36).substr(2, 9),
        transactionType: beneficiary?.transactionType || "NEFT",
        timestamp: new Date().toISOString()
      });
      
      // Show success modal
      setIsSuccessModalOpen(true);
      // Clear amount field for this row after successful payment
      setPayoutAmounts(prev => ({ ...prev, [beneficiaryId]: "" }));
      // Optionally: Fetch transactions again if you want the new one to appear immediately
      // if (activeTab === "Transactions") fetchTransactions();

    } catch (error: any) {
      console.error("Error creating transaction:", error);
      toast({
        title: "Transaction Error",
        description: error.message || "Could not initiate transaction.",
        variant: "destructive",
      });
      if (error.message === "Authentication token not found.") {
        router.push('/Auth/login');
      }
    } finally {
      setRowLoading(beneficiaryId, false);
    }
  };

  const handleDeleteBeneficiary = async (beneficiaryId: string) => {
     // Optional: Add a confirmation dialog here
     // if (!confirm("Are you sure you want to delete this beneficiary?")) {
     //     return;
     // }

     setRowLoading(beneficiaryId, true);
    try {
      const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
      if (!token) throw new Error("Authentication token not found.");

      // Using DELETE request as per your API structure
      const response = await fetch(`/api/beneficiaries`, { // Endpoint might need adjustment
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ beneficiaryId: beneficiaryId }), // Sending ID in the body
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Deletion failed");
      }

      toast({ title: "Success", description: "Beneficiary deleted successfully." });
      // Remove from local state
      setBeneficiaries(prev => prev.filter(b => b.id !== beneficiaryId));
      // fetchBeneficiaries(false); // Alternative: refetch list silently

    } catch (error: any) {
      console.error("Error deleting beneficiary:", error);
      toast({
        title: "Deletion Error",
        description: error.message || "Could not delete beneficiary.",
        variant: "destructive",
      });
      if (error.message === "Authentication token not found.") {
        router.push('/Auth/login');
      }
    } finally {
      setRowLoading(beneficiaryId, false);
    }
  };


  // --- Tab Button Component --- (Keep as is)
  interface TabButtonProps { label: "Beneficiary" | "New Beneficiary" | "Transactions" | "UPI"; currentTab: string; onClick: () => void; delay: number; }
  const TabButton: React.FC<TabButtonProps> = ({ label, currentTab, onClick, delay }) => ( <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay }} onClick={onClick} className={`px-4 py-2 sm:px-6 sm:py-3 text-sm font-medium focus:outline-none transition-colors duration-200 ${ currentTab === label ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground" }`} > {label} </motion.button> );


  return (
    <MainLayout location={"/beneficiaries"}>
      <TransactionSuccessModal 
      isOpen={isSuccessModalOpen}
      onClose={() => setIsSuccessModalOpen(false)}
      transactionDetails={transactionDetails}
    />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} >
            <h1 className="text-2xl font-semibold">Payouts</h1>
            <p className="text-muted-foreground">Manage your beneficiaries and payouts</p>
          </motion.div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {activeTab === "Beneficiary" && (
                 <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="relative flex-grow sm:flex-grow-0" >
                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                 <input type="text" placeholder="Search beneficiaries..." className="pl-10 pr-4 py-2 w-full bg-secondary/30 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                 </motion.div>
            )}
            <motion.button initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }} onClick={() => setActiveTab("New Beneficiary")} className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200 gap-2" >
              <Plus className="h-4 w-4" /> New Beneficiary
            </motion.button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border overflow-x-auto">
          <TabButton label="Beneficiary" currentTab={activeTab} onClick={() => setActiveTab("Beneficiary")} delay={0} />
          <TabButton label="New Beneficiary" currentTab={activeTab} onClick={() => setActiveTab("New Beneficiary")} delay={0.1} />
          <TabButton label="Transactions" currentTab={activeTab} onClick={() => setActiveTab("Transactions")} delay={0.2} />
          <TabButton label="UPI" currentTab={activeTab} onClick={() => setActiveTab("UPI")} delay={0.3} />
        </div>

        {/* Content Area */}
        <div className="mt-6">
          {/* Beneficiary List Tab */}
          {activeTab === "Beneficiary" && (
            <motion.div key="beneficiary-list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm" >
              {loading ? ( <div className="flex items-center justify-center h-60"> <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div> </div>
              ) : beneficiaries.length === 0 ? ( <div className="text-center py-10 text-muted-foreground">No beneficiaries found. Add one using the button above.</div>
              ) : (
                <DataTable
                  data={filteredBeneficiaries}
                  columns={[
                    { key: "accountHolderName", header: "Name", className: "font-medium min-w-[150px]" },
                    { key: "accountNumber", header: "Account No.", className: "min-w-[150px]" },
                    { key: "transactionType", header: "Type", className: "min-w-[80px]" },
                    {
                      key: "verified", // Combined Verify status and action
                      header: "Status / Verify",
                      className: "min-w-[120px]",
                      render: (row: Beneficiary) => (
                        <div className="flex items-center gap-2">
                           {row.isVerified ? (
                             <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                               <CheckCircle className="h-3 w-3" /> Verified
                             </span>
                           ) : (
                              <button
                                onClick={() => handleVerifyBeneficiary(row.id)}
                                disabled={actionLoading[row.id]}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {actionLoading[row.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                Verify
                              </button>
                           )}
                        </div>
                      )
                    },
                    {
                        key: "amount",
                        header: "Amount (₹)",
                        className: "min-w-[130px]",
                        render: (row: Beneficiary) => (
                           <div className="relative">
                                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                                <input
                                    type="text" // Use text to allow decimal formatting easily
                                    inputMode="decimal" // Hint for mobile keyboards
                                    value={payoutAmounts[row.id] || ""}
                                    onChange={(e) => handleAmountChange(row.id, e.target.value)}
                                    disabled={!row.isVerified || actionLoading[row.id]} // Disable if not verified or an action is loading
                                    className="pl-6 pr-2 py-1 w-full bg-secondary/30 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    placeholder="0.00"
                                />
                           </div>
                        ),
                    },
                    {
                      key: "actions",
                      header: "Actions",
                      className: "min-w-[120px]", // Adjust width as needed
                      render: (row: Beneficiary) => {
                         const amountEntered = parseFloat(payoutAmounts[row.id] || "0") > 0;
                         return (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handlePayBeneficiary(row.id)}
                                disabled={!row.isVerified || !amountEntered || actionLoading[row.id]}
                                className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {actionLoading[row.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Banknote className="h-3 w-3" /> }
                                Pay
                              </button>
                              <button
                                onClick={() => handleDeleteBeneficiary(row.id)}
                                disabled={actionLoading[row.id]}
                                className="p-1.5 rounded text-red-500 hover:bg-red-500/10 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete Beneficiary"
                              >
                                {actionLoading[row.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" /> }
                              </button>
                           </div>
                         );
                       }
                    },
                  ]}
                  rowHoverEffect={true}
                />
              )}
            </motion.div>
          )}

          {/* New Beneficiary Tab */}
           {activeTab === "New Beneficiary" && (
             <motion.div key="new-beneficiary-form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-3xl mx-auto bg-card p-6 sm:p-8 rounded-xl border border-border/40 shadow-sm" >
               <h2 className="text-xl font-semibold mb-6">Beneficiary Details</h2>
               {/* --- FORM REMAINS THE SAME AS BEFORE --- */}
               <form onSubmit={handleAddBeneficiary} className="space-y-5">
                 {/* Account Numbers */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div>
                     <label htmlFor="accountNumber" className="block text-sm font-medium text-muted-foreground mb-1"><span className="text-red-500">*</span> Account Number</label>
                     <div className="relative">
                        <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <input type="text" id="accountNumber" name="accountNumber" value={newBeneficiaryData.accountNumber} onChange={handleInputChange} required className="pl-10 pr-4 py-2 w-full bg-secondary/30 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Enter Account Number" />
                     </div>
                   </div>
                   <div>
                     <label htmlFor="confirmAccountNumber" className="block text-sm font-medium text-muted-foreground mb-1"><span className="text-red-500">*</span> Confirm Account Number</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <input type="text" id="confirmAccountNumber" name="confirmAccountNumber" value={newBeneficiaryData.confirmAccountNumber} onChange={handleInputChange} required className={`pl-10 pr-4 py-2 w-full bg-secondary/30 border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary ${ newBeneficiaryData.accountNumber && newBeneficiaryData.confirmAccountNumber && newBeneficiaryData.accountNumber !== newBeneficiaryData.confirmAccountNumber ? 'border-red-500 ring-red-500' : 'border-border' }`} placeholder="Confirm Account Number" />
                     </div>
                   </div>
                 </div>
                 {/* Transaction Type & Bank */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div>
                         <label className="block text-sm font-medium text-muted-foreground mb-1"><span className="text-red-500">*</span> Transaction Type</label>
                         <div className="flex rounded-lg border border-border overflow-hidden">
                         {/* <button type="button" onClick={() => handleTransactionTypeToggle("NEFT")} className={`flex-1 px-4 py-2 text-sm focus:outline-none ${ newBeneficiaryData.transactionType === 'NEFT' ? 'bg-primary/10 text-primary font-medium' : 'bg-secondary/30 hover:bg-secondary/50 text-muted-foreground' }`} > NEFT <span className="text-xs hidden sm:inline">(With IFSC)</span> </button> */}
                         <button type="button" onClick={() => handleTransactionTypeToggle("IMPS")} className={`flex-1 px-4 py-2 text-sm focus:outline-none border-l border-border ${ newBeneficiaryData.transactionType === 'IMPS' ? 'bg-primary/10 text-primary font-medium' : 'bg-secondary/30 hover:bg-secondary/50 text-muted-foreground' }`} > IMPS <span className="text-xs hidden sm:inline">(Without IFSC)</span> </button>
                         </div>
                     </div>
                      <div>
                          <label htmlFor="bank" className="block text-sm font-medium text-muted-foreground mb-1"><span className="text-red-500">*</span> Bank</label>
                          <div className="relative">
                             <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                             <select id="bank" name="bank" value={newBeneficiaryData.bank} onChange={handleInputChange} required className="appearance-none pl-10 pr-8 py-2 w-full bg-secondary/30 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" >
                                 <option value="" disabled>Select Bank</option> <option value="SBI">State Bank of India</option> <option value="HDFC">HDFC Bank</option> <option value="ICICI">ICICI Bank</option> <option value="AXIS">Axis Bank</option> <option value="KOTAK">Kotak Mahindra Bank</option>
                             </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground"> <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg> </div>
                          </div>
                          {/* <div className="mt-2 flex gap-2 items-center"> <span className="text-xs text-muted-foreground">Top Banks:</span> <img src="https://via.placeholder.com/24?text=B1" alt="Bank 1" className="h-6 w-6 rounded-sm object-contain" /> <img src="https://via.placeholder.com/24?text=B2" alt="Bank 2" className="h-6 w-6 rounded-sm object-contain" /> <img src="https://via.placeholder.com/24?text=B3" alt="Bank 3" className="h-6 w-6 rounded-sm object-contain" /> </div> */}
                      </div>
                  </div>
                  {/* Beneficiary Name & Verify Button (Simulation) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
                    <div>
                      <label htmlFor="accountHolderName" className="block text-sm font-medium text-muted-foreground mb-1"><span className="text-red-500">*</span> Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <input type="text" id="accountHolderName" name="accountHolderName" value={newBeneficiaryData.accountHolderName} onChange={handleInputChange} required className="pl-10 pr-4 py-2 w-full bg-secondary/30 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Enter Beneficiary Name" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={handleVerifyAccountSimulated} disabled={formLoading || !newBeneficiaryData.accountNumber || !newBeneficiaryData.confirmAccountNumber || !newBeneficiaryData.bank || !newBeneficiaryData.accountHolderName || newBeneficiaryData.accountNumber !== newBeneficiaryData.confirmAccountNumber} className={`w-full sm:w-auto px-4 py-2 border border-border rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${formLoading ? 'bg-secondary/50 text-muted-foreground cursor-not-allowed' : 'bg-secondary/30 hover:bg-secondary/50 text-foreground disabled:opacity-50 disabled:cursor-not-allowed'}`} >
                         {formLoading && isAccountVerifiedSimulated === null ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                         {isAccountVerifiedSimulated === true ? <CheckCircle className="h-4 w-4 text-green-500" /> : null}
                         {isAccountVerifiedSimulated === false ? <XCircle className="h-4 w-4 text-red-500" /> : null}
                         {isAccountVerifiedSimulated === null ? 'Verify' : (isAccountVerifiedSimulated ? 'Verified' : 'Verify Failed')}
                      </button>
                      {isAccountVerifiedSimulated !== null && ( <span className={`text-xs ${isAccountVerifiedSimulated ? 'text-green-600' : 'text-red-600'}`}> {isAccountVerifiedSimulated ? 'Account looks good!' : 'Verification failed.'} </span> )}
                    </div>
                  </div>
                 {/* Action Buttons */}
                 <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                   <button type="button" onClick={handleClearForm} disabled={formLoading} className="px-5 py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary/40 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50" > Clear </button>
                   <button type="submit" disabled={formLoading} className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" >
                     {formLoading ? ( <><Loader2 className="animate-spin h-4 w-4" /> Adding...</> ) : ( 'Submit' )}
                   </button>
                 </div>
               </form>
             </motion.div>
           )}

          {/* Transactions Tab */}
           {activeTab === "Transactions" && (
             <motion.div key="transactions-list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm" >
               {loading ? ( <div className="flex items-center justify-center h-60"> <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div> </div>
               ) : transactions.length === 0 ? ( <div className="text-center py-10 text-muted-foreground">No transactions found.</div>
               ) : ( /* --- TRANSACTION TABLE REMAINS THE SAME --- */
                 <DataTable data={transactions} columns={[ { key: "transactionTime", header: "Date", render: (row) => new Date(row.transactionTime).toLocaleDateString() }, { key: "beneficiary.accountHolderName", header: "Beneficiary Name", render: (row) => row.beneficiary?.accountHolderName || 'N/A' }, { key: "beneficiary.accountNumber", header: "Account No.", render: (row) => row.beneficiary?.accountNumber || 'N/A' }, { key: "amount", header: "Amount", render: (row) => `₹${Number(row.amount).toFixed(2)}` }, { key: "chargesAmount", header: "Charges", render: (row) => `₹${Number(row.chargesAmount).toFixed(2)}` }, { key: "transactionType", header: "Type" }, { key: "transactionStatus", header: "Status", render: (row) => ( <span className={`px-2 py-1 rounded text-xs font-medium ${ row.transactionStatus === 'COMPLETED' ? 'bg-green-100 text-green-700' : row.transactionStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700' }`}> {row.transactionStatus} </span> ) }, ]} />
               )}
             </motion.div>
           )}

          {/* UPI Tab */}
          {activeTab === "UPI" && ( <motion.div key="upi-content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center py-10 text-muted-foreground bg-card p-6 rounded-xl border border-border/40 shadow-sm" > UPI Management Feature Coming Soon! </motion.div> )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Beneficiaries;
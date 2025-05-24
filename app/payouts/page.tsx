"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, User, Hash, Building, CheckCircle, XCircle, Banknote, Trash2, Loader2,
  ArrowRightLeft, Zap, Wifi, Smartphone, CreditCard as CreditCardIcon, ListChecks, Send, AtSign
} from "lucide-react";
import MainLayout from "../components/MainLayout";
import { motion } from "framer-motion";
import DataTable from "../components/DataTable";
import { useToast } from "../hooks/use-toast";
import { useRouter } from "next/navigation";
import { Button } from "../components/ui/button";
import TransactionSuccessModal from "../components/TransactionSuccessfull"; // Your existing modal

// --- Interface Definitions ---
interface BankBeneficiary {
  id: string;
  accountNumber: string;
  accountHolderName: string;
  transactionType: 'NEFT' | 'IMPS';
  isVerified: boolean;
  createdAt: string;
  userId: string;
  bankName?: string;
  ifscCode?: string;
}

interface UpiBeneficiary {
  id: string;
  upiId: string;
  accountHolderName: string;
  isVerified: boolean;
  createdAt: string;
  userId: string;
}

interface Transaction {
  id: string;
  amount: number;
  chargesAmount: number;
  transactionType: 'NEFT' | 'IMPS' | 'UPI' | 'RECHARGE' | 'BILL_PAYMENT' | 'DMT' | 'CREDIT_CARD_PAYMENT';
  transactionStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  transactionTime: string;
  beneficiaryName?: string;
  beneficiaryIdentifier?: string;
  description?: string;
}

// For the modal - this should match what TransactionSuccessModal expects
interface TransactionDetailsForModal {
    amount: number;
    beneficiaryName: string;
    accountNumber: string; // This will hold account no. OR UPI ID
    transactionId: string;
    transactionType: 'NEFT' | 'IMPS' | 'UPI' | string; // Allow broader string for future services
    timestamp: string;
}


type ServiceTab = "IMPS" | "UPI" | "Recharge" | "DMT" | "BillPayments" | "CreditCardPayment" | "Transactions";
type ImpsSubTab = "ViewBankBeneficiaries" | "AddBankBeneficiary";
type UpiSubTab = "ViewUpiBeneficiaries" | "AddUpiBeneficiary";

const ServicesPage = () => {
  const [activeServiceTab, setActiveServiceTab] = useState<ServiceTab>("IMPS");
  const [activeImpsSubTab, setActiveImpsSubTab] = useState<ImpsSubTab>("ViewBankBeneficiaries");
  const [activeUpiSubTab, setActiveUpiSubTab] = useState<UpiSubTab>("ViewUpiBeneficiaries");

  const [searchQuery, setSearchQuery] = useState("");
  const [bankBeneficiaries, setBankBeneficiaries] = useState<BankBeneficiary[]>([]);
  const [upiBeneficiaries, setUpiBeneficiaries] = useState<UpiBeneficiary[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // --- State for TransactionSuccessModal ---
  // Explicitly type this state to match what the modal expects
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetailsForModal>({
    amount: 0,
    beneficiaryName: "",
    accountNumber: "", // Will hold account number or UPI ID
    transactionId: "",
    transactionType: "IMPS", // Default or last used
    timestamp: new Date().toISOString()
  });

  const [payoutAmounts, setPayoutAmounts] = useState<{ [key: string]: string }>({});
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  const { toast } = useToast();
  const router = useRouter();

  const [newBankBeneficiaryData, setNewBankBeneficiaryData] = useState({
    accountNumber: "",
    confirmAccountNumber: "",
    accountHolderName: "",
    ifscCode: "",
    transactionType: "IMPS" as "NEFT" | "IMPS",
  });
  const [isBankAccountVerifiedSim, setIsBankAccountVerifiedSim] = useState<boolean | null>(null);

  const [newUpiBeneficiaryData, setNewUpiBeneficiaryData] = useState({
    upiId: "",
    accountHolderName: "",
  });
  const [isUpiVerifiedSim, setIsUpiVerifiedSim] = useState<boolean | null>(null);

  const setRowLoading = (id: string, isLoading: boolean) => {
    setActionLoading(prev => ({ ...prev, [id]: isLoading }));
  };

  const fetchBankBeneficiaries = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const dummyData: BankBeneficiary[] = [
        { id: 'bank1', accountNumber: '123456789012', accountHolderName: 'Alice Smith (Bank)', transactionType: 'IMPS', isVerified: true, createdAt: new Date().toISOString(), userId: 'user1', bankName: 'Global Bank', ifscCode: 'GBIN0001234' },
        { id: 'bank2', accountNumber: '098765432109', accountHolderName: 'Bob Johnson (Bank)', transactionType: 'NEFT', isVerified: false, createdAt: new Date().toISOString(), userId: 'user1', bankName: 'National Bank', ifscCode: 'NBIN0005678' },
      ];
    setBankBeneficiaries(dummyData);
    if (showLoading) setLoading(false);
  }, []);

  const fetchUpiBeneficiaries = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const dummyData: UpiBeneficiary[] = [
        { id: 'upi1', upiId: 'alice@okbank', accountHolderName: 'Alice Smith (UPI)', isVerified: true, createdAt: new Date().toISOString(), userId: 'user1' },
        { id: 'upi2', upiId: 'bob.john@okaxis', accountHolderName: 'Bob J.', isVerified: true, createdAt: new Date().toISOString(), userId: 'user1' },
      ];
    setUpiBeneficiaries(dummyData);
    if (showLoading) setLoading(false);
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const dummyTransactions: Transaction[] = [
        {id: 't1', amount: 100, chargesAmount: 2, transactionType: 'IMPS', transactionStatus: 'COMPLETED', transactionTime: new Date().toISOString(), beneficiaryName: 'Alice Smith (Bank)', beneficiaryIdentifier: '...9012'},
        {id: 't2', amount: 50, chargesAmount: 1, transactionType: 'UPI', transactionStatus: 'PENDING', transactionTime: new Date().toISOString(), beneficiaryName: 'Bob J. (UPI)', beneficiaryIdentifier: 'bob.john@okaxis'},
    ];
    setTransactions(dummyTransactions);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeServiceTab === "IMPS") fetchBankBeneficiaries();
    else if (activeServiceTab === "UPI") fetchUpiBeneficiaries();
    else if (activeServiceTab === "Transactions") fetchTransactions();
    setSearchQuery("");
  }, [activeServiceTab, fetchBankBeneficiaries, fetchUpiBeneficiaries, fetchTransactions]);

  const filteredBankBeneficiaries = bankBeneficiaries.filter(b =>
    b.accountHolderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.accountNumber.includes(searchQuery) ||
    (b.ifscCode && b.ifscCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredUpiBeneficiaries = upiBeneficiaries.filter(b =>
    b.accountHolderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.upiId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBankInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewBankBeneficiaryData(prev => ({ ...prev, [name]: value }));
    if (name === 'accountNumber' || name === 'confirmAccountNumber') setIsBankAccountVerifiedSim(null);
  };

  const handleAddBankBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    if (newBankBeneficiaryData.accountNumber !== newBankBeneficiaryData.confirmAccountNumber) {
        toast({ title: "Error", description: "Account numbers do not match.", variant: "destructive" });
        setFormLoading(false); return;
    }
    if (!newBankBeneficiaryData.ifscCode.match(/^[A-Z]{4}0[A-Z0-9]{6}$/)) {
        toast({ title: "Error", description: "Invalid IFSC code format.", variant: "destructive" });
        setFormLoading(false); return;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({ title: "Success (Simulated)", description: "Bank beneficiary added." });
    setNewBankBeneficiaryData({ accountNumber: "", confirmAccountNumber: "", accountHolderName: "", ifscCode: "", transactionType: "IMPS" });
    setIsBankAccountVerifiedSim(null);
    setActiveImpsSubTab("ViewBankBeneficiaries");
    fetchBankBeneficiaries(false);
    setFormLoading(false);
  };
  
  const handleUpiInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUpiBeneficiaryData(prev => ({ ...prev, [name]: value }));
    setIsUpiVerifiedSim(null);
  };

  const handleVerifyUpiSimulated = async () => {
      if (!newUpiBeneficiaryData.upiId.match(/^[\w.-]+@[\w.-]+$/)) {
          toast({ title: "Error", description: "Invalid UPI ID format.", variant: "destructive" });
          setIsUpiVerifiedSim(false); return;
      }
      setFormLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const success = Math.random() > 0.2;
      setIsUpiVerifiedSim(success);
      setFormLoading(false);
      toast({
          title: success ? "UPI Verification Successful" : "UPI Verification Failed",
          description: success ? `Name: Mock User ${Math.floor(Math.random()*100)} (Simulated)` : "Could not verify UPI ID.",
          variant: success ? "default" : "destructive",
      });
      if (success && !newUpiBeneficiaryData.accountHolderName) {
        setNewUpiBeneficiaryData(prev => ({...prev, accountHolderName: `Mock User ${Math.floor(Math.random()*100)}`}));
      }
  };

  const handleAddUpiBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    if (!isUpiVerifiedSim) {
        toast({ title: "Error", description: "Please verify UPI ID before adding.", variant: "destructive" });
        setFormLoading(false); return;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({ title: "Success (Simulated)", description: "UPI beneficiary added." });
    setNewUpiBeneficiaryData({ upiId: "", accountHolderName: "" });
    setIsUpiVerifiedSim(null);
    setActiveUpiSubTab("ViewUpiBeneficiaries");
    fetchUpiBeneficiaries(false);
    setFormLoading(false);
  };

  const handleAmountChange = (id: string, amount: string) => {
    const validAmount = amount.match(/^\d*\.?\d*$/);
    if (validAmount) setPayoutAmounts(prev => ({ ...prev, [id]: amount }));
  };

  const handlePay = async (beneficiaryId: string, type: 'BANK' | 'UPI') => {
    const amountStr = payoutAmounts[beneficiaryId] || "";
    const amount = parseFloat(amountStr);
    let beneficiaryDetails: BankBeneficiary | UpiBeneficiary | undefined;
    let modalAccountNumberForDisplay: string = ""; // This will hold the acc no or UPI ID
    let modalBeneficiaryName: string = "N/A";
    let apiTransactionType: 'IMPS' | 'NEFT' | 'UPI' = 'IMPS'; // For API call

    if (type === 'BANK') {
        beneficiaryDetails = bankBeneficiaries.find(b => b.id === beneficiaryId);
        if (beneficiaryDetails) {
            modalAccountNumberForDisplay = (beneficiaryDetails as BankBeneficiary).accountNumber;
            modalBeneficiaryName = beneficiaryDetails.accountHolderName;
            apiTransactionType = (beneficiaryDetails as BankBeneficiary).transactionType;
        }
    } else { // UPI
        beneficiaryDetails = upiBeneficiaries.find(b => b.id === beneficiaryId);
        if (beneficiaryDetails) {
            modalAccountNumberForDisplay = (beneficiaryDetails as UpiBeneficiary).upiId;
            modalBeneficiaryName = beneficiaryDetails.accountHolderName || (beneficiaryDetails as UpiBeneficiary).upiId;
            apiTransactionType = 'UPI';
        }
    }

    if (!beneficiaryDetails) {
        toast({ title: "Error", description: "Beneficiary not found.", variant: "destructive" }); return;
    }
    if (!beneficiaryDetails.isVerified) {
        toast({ title: "Error", description: "Beneficiary must be verified.", variant: "destructive" }); return;
    }
    if (isNaN(amount) || amount <= 0) {
        toast({ title: "Error", description: "Please enter a valid amount.", variant: "destructive" }); return;
    }

    setRowLoading(beneficiaryId, true);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call

    // Populate transactionDetails state for the modal
    setTransactionDetails({
        amount: amount,
        beneficiaryName: modalBeneficiaryName,
        accountNumber: modalAccountNumberForDisplay, // Use the determined identifier here
        transactionId: "TXN_SIM_" + Date.now(),      // Simulated
        transactionType: apiTransactionType,         // This is crucial for the modal to display correctly
        timestamp: new Date().toISOString()
    });

    toast({ title: "Success (Simulated)", description: `Payment of ₹${amount} to ${modalBeneficiaryName} initiated.` });
    setIsSuccessModalOpen(true);
    setPayoutAmounts(prev => ({ ...prev, [beneficiaryId]: "" }));
    setRowLoading(beneficiaryId, false);
    if(activeServiceTab === "Transactions") fetchTransactions();
  };
  
  interface ServiceTabButtonProps { label: ServiceTab; icon: React.ElementType; currentTab: ServiceTab; onClick: () => void; }
  const ServiceTabButton: React.FC<ServiceTabButtonProps> = ({ label, icon: Icon, currentTab, onClick }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center space-y-1 p-3 md:px-4 md:py-3 min-w-[80px] md:min-w-[100px] text-xs md:text-sm font-medium focus:outline-none transition-all duration-200 group ${currentTab === label ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-t-md"}`}>
      <Icon className={`h-5 w-5 md:h-6 md:w-6 mb-0.5 transition-colors ${currentTab === label ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
      <span>{label.replace(/([A-Z])/g, ' $1').trim()}</span>
    </button>
  );

  interface SubTabButtonProps { label: string; currentSubTab: string; onClick: () => void; }
  const SubTabButton: React.FC<SubTabButtonProps> = ({ label, currentSubTab, onClick }) => (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium focus:outline-none rounded-md transition-colors ${currentSubTab === label.replace(/\s+/g, '') ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
      {label}
    </button>
  );

  const renderPlaceholder = (serviceName: string) => (
    <motion.div key={`${serviceName}-placeholder`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center py-12 md:py-20 text-muted-foreground bg-card p-6 rounded-xl border border-border/40 shadow-sm">
      <ListChecks className="h-16 w-16 mx-auto mb-4 text-primary/50" />
      <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">{serviceName}</h2>
      <p>This feature is under development and will be available soon.</p>
    </motion.div>
  );

  return (
    <MainLayout location="/payouts">
      <TransactionSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        transactionDetails={transactionDetails} // Passing the state here
      />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h1 className="text-2xl font-semibold">Services</h1>
            <p className="text-muted-foreground">Access various payment and utility services.</p>
          </motion.div>
        </div>

        <div className="border-b border-border">
          <div className="flex space-x-1 overflow-x-auto pb-px hide-scrollbar">
            <ServiceTabButton label="IMPS" icon={ArrowRightLeft} currentTab={activeServiceTab} onClick={() => setActiveServiceTab("IMPS")} />
            <ServiceTabButton label="UPI" icon={AtSign} currentTab={activeServiceTab} onClick={() => setActiveServiceTab("UPI")} />
            <ServiceTabButton label="Recharge" icon={Smartphone} currentTab={activeServiceTab} onClick={() => setActiveServiceTab("Recharge")} />
            <ServiceTabButton label="DMT" icon={Send} currentTab={activeServiceTab} onClick={() => setActiveServiceTab("DMT")} />
            <ServiceTabButton label="BillPayments" icon={Zap} currentTab={activeServiceTab} onClick={() => setActiveServiceTab("BillPayments")} />
            <ServiceTabButton label="CreditCardPayment" icon={CreditCardIcon} currentTab={activeServiceTab} onClick={() => setActiveServiceTab("CreditCardPayment")} />
            <ServiceTabButton label="Transactions" icon={ListChecks} currentTab={activeServiceTab} onClick={() => setActiveServiceTab("Transactions")} />
          </div>
        </div>

        <div className="mt-2 md:mt-4">
          {activeServiceTab === "IMPS" && (
            <motion.div key="imps-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <div className="mb-4 p-4 bg-card border border-border/40 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div><h2 className="text-xl font-semibold text-foreground">Bank Transfers (IMPS/NEFT)</h2><p className="text-sm text-muted-foreground">Manage bank account beneficiaries and send money.</p></div>
                <div className="flex space-x-2"><SubTabButton label="View Beneficiaries" currentSubTab={activeImpsSubTab} onClick={() => setActiveImpsSubTab("ViewBankBeneficiaries")} /><SubTabButton label="Add Beneficiary" currentSubTab={activeImpsSubTab} onClick={() => setActiveImpsSubTab("AddBankBeneficiary")} /></div>
              </div>
              {activeImpsSubTab === "ViewBankBeneficiaries" && (
                <motion.div key="view-bank-beneficiaries" initial={{ opacity: 0, y:10 }} animate={{ opacity: 1, y:0 }} className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm p-4 md:p-6">
                   <div className="relative mb-4"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" /><input type="text" placeholder="Search by name, account, IFSC..." className="pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                  {loading ? <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary"/></div> :
                    filteredBankBeneficiaries.length === 0 ? <div className="text-center py-10 text-muted-foreground">No bank beneficiaries found.</div> :
                    <DataTable data={filteredBankBeneficiaries} columns={[ { key: "accountHolderName", header: "Name", className: "font-medium min-w-[150px]" }, { key: "accountNumber", header: "Account No.", className: "min-w-[150px]" }, { key: "ifscCode", header: "IFSC", className: "min-w-[120px]", render: (row: BankBeneficiary) => row.ifscCode || 'N/A' }, { key: "transactionType", header: "Type", className: "min-w-[80px]" }, { key: "isVerified", header: "Status", className: "min-w-[100px]", render: (row: BankBeneficiary) => row.isVerified ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400"><CheckCircle className="h-3 w-3" /> Verified</span> : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"><XCircle className="h-3 w-3" /> Not Verified</span> }, { key: "amount", header: "Amount (₹)", className: "min-w-[130px]", render: (row: BankBeneficiary) => ( <div className="relative"><span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">₹</span><input type="text" inputMode="decimal" value={payoutAmounts[row.id] || ""} onChange={(e) => handleAmountChange(row.id, e.target.value)} disabled={!row.isVerified || actionLoading[row.id]} className="pl-6 pr-2 py-1 w-full bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm" placeholder="0.00"/></div> )}, { key: "actions", header: "Actions", className: "min-w-[100px]", render: (row: BankBeneficiary) => (<button onClick={() => handlePay(row.id, 'BANK')} disabled={!row.isVerified || !(parseFloat(payoutAmounts[row.id] || "0") > 0) || actionLoading[row.id]} className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed">{actionLoading[row.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Banknote className="h-3 w-3" />}Pay</button>) }, ]} /> }
                </motion.div>
              )}
              {activeImpsSubTab === "AddBankBeneficiary" && ( <motion.div key="add-bank-beneficiary" initial={{ opacity: 0, y:10 }} animate={{ opacity: 1, y:0 }} className="max-w-2xl mx-auto bg-card p-6 sm:p-8 rounded-xl border border-border/40 shadow-sm"> <h3 className="text-lg font-semibold mb-6 text-foreground">Add New Bank Beneficiary</h3> <form onSubmit={handleAddBankBeneficiary} className="space-y-5"> <div className="grid grid-cols-1 md:grid-cols-2 gap-5"> <div> <label htmlFor="accountNumber" className="block text-sm font-medium text-muted-foreground mb-1">Account Number <span className="text-destructive">*</span></label> <div className="relative"><Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" /><input type="text" id="accountNumber" name="accountNumber" value={newBankBeneficiaryData.accountNumber} onChange={handleBankInputChange} required className="pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Enter Account Number" /></div> </div> <div> <label htmlFor="confirmAccountNumber" className="block text-sm font-medium text-muted-foreground mb-1">Confirm Account No. <span className="text-destructive">*</span></label> <div className="relative"><Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" /><input type="text" id="confirmAccountNumber" name="confirmAccountNumber" value={newBankBeneficiaryData.confirmAccountNumber} onChange={handleBankInputChange} required className={`pl-10 pr-4 py-2 w-full bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary ${ newBankBeneficiaryData.accountNumber && newBankBeneficiaryData.confirmAccountNumber && newBankBeneficiaryData.accountNumber !== newBankBeneficiaryData.confirmAccountNumber ? 'border-destructive ring-destructive' : 'border-border' }`} placeholder="Confirm Account Number" /></div> </div> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-5"> <div> <label htmlFor="ifscCode" className="block text-sm font-medium text-muted-foreground mb-1">IFSC Code <span className="text-destructive">*</span></label> <div className="relative"><Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" /><input type="text" id="ifscCode" name="ifscCode" value={newBankBeneficiaryData.ifscCode} onChange={handleBankInputChange} required className="uppercase pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Enter IFSC Code" /></div> </div> <div> <label htmlFor="accountHolderName" className="block text-sm font-medium text-muted-foreground mb-1">Account Holder Name <span className="text-destructive">*</span></label> <div className="relative"><User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" /><input type="text" id="accountHolderName" name="accountHolderName" value={newBankBeneficiaryData.accountHolderName} onChange={handleBankInputChange} required className="pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" placeholder="As per bank records" /></div> </div> </div> <div className="flex justify-end gap-3 pt-3"> <Button type="button" variant="outline" onClick={() => setActiveImpsSubTab("ViewBankBeneficiaries")} disabled={formLoading}>Cancel</Button> <Button type="submit" disabled={formLoading}> {formLoading ? <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Adding...</> : 'Add Beneficiary'} </Button> </div> </form> </motion.div> )}
            </motion.div>
          )}

          {activeServiceTab === "UPI" && ( <motion.div key="upi-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}> <div className="mb-4 p-4 bg-card border border-border/40 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"> <div> <h2 className="text-xl font-semibold text-foreground">UPI Payments</h2> <p className="text-sm text-muted-foreground">Manage UPI IDs and send money instantly.</p> </div> <div className="flex space-x-2"> <SubTabButton label="View UPI IDs" currentSubTab={activeUpiSubTab} onClick={() => setActiveUpiSubTab("ViewUpiBeneficiaries")} /> <SubTabButton label="Add UPI ID" currentSubTab={activeUpiSubTab} onClick={() => setActiveUpiSubTab("AddUpiBeneficiary")} /> </div> </div> {activeUpiSubTab === "ViewUpiBeneficiaries" && ( <motion.div key="view-upi-ids" initial={{ opacity: 0, y:10 }} animate={{ opacity: 1, y:0 }} className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm p-4 md:p-6"> <div className="relative mb-4"> <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" /> <input type="text" placeholder="Search by UPI ID or name..." className="pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /> </div> {loading ? <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary"/></div> : filteredUpiBeneficiaries.length === 0 ? <div className="text-center py-10 text-muted-foreground">No UPI beneficiaries found.</div> : <DataTable data={filteredUpiBeneficiaries} columns={[ { key: "upiId", header: "UPI ID", className: "font-medium min-w-[180px]" }, { key: "accountHolderName", header: "Name", className: "min-w-[150px]", render: (row: UpiBeneficiary) => row.accountHolderName || <span className="text-muted-foreground italic">Not specified</span> }, { key: "isVerified", header: "Status", className: "min-w-[100px]", render: (row: UpiBeneficiary) => row.isVerified ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400"><CheckCircle className="h-3 w-3" /> Verified</span> : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"><XCircle className="h-3 w-3" /> Not Verified</span> }, { key: "amount", header: "Amount (₹)", className: "min-w-[130px]", render: (row: UpiBeneficiary) => ( <div className="relative"><span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">₹</span><input type="text" inputMode="decimal" value={payoutAmounts[row.id] || ""} onChange={(e) => handleAmountChange(row.id, e.target.value)} disabled={!row.isVerified || actionLoading[row.id]} className="pl-6 pr-2 py-1 w-full bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm" placeholder="0.00"/></div> )}, { key: "actions", header: "Actions", className: "min-w-[100px]", render: (row: UpiBeneficiary) => (<button onClick={() => handlePay(row.id, 'UPI')} disabled={!row.isVerified || !(parseFloat(payoutAmounts[row.id] || "0") > 0) || actionLoading[row.id]} className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed">{actionLoading[row.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Banknote className="h-3 w-3" />}Pay</button>) }, ]} /> } </motion.div> )} {activeUpiSubTab === "AddUpiBeneficiary" && ( <motion.div key="add-upi-beneficiary" initial={{ opacity: 0, y:10 }} animate={{ opacity: 1, y:0 }} className="max-w-xl mx-auto bg-card p-6 sm:p-8 rounded-xl border border-border/40 shadow-sm"> <h3 className="text-lg font-semibold mb-6 text-foreground">Add New UPI ID</h3> <form onSubmit={handleAddUpiBeneficiary} className="space-y-5"> <div> <label htmlFor="upiId" className="block text-sm font-medium text-muted-foreground mb-1">UPI ID (VPA) <span className="text-destructive">*</span></label> <div className="relative"> <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" /> <input type="text" id="upiId" name="upiId" value={newUpiBeneficiaryData.upiId} onChange={handleUpiInputChange} required className="pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" placeholder="yourname@bank" /> </div> </div> <div className="flex items-end gap-3"> <div className="flex-grow"> <label htmlFor="upiAccountHolderName" className="block text-sm font-medium text-muted-foreground mb-1">Beneficiary Name (Optional)</label> <div className="relative"> <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" /> <input type="text" id="upiAccountHolderName" name="accountHolderName" value={newUpiBeneficiaryData.accountHolderName} onChange={handleUpiInputChange} className="pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Name for your reference" /> </div> </div> <Button type="button" variant="secondary" onClick={handleVerifyUpiSimulated} disabled={formLoading || !newUpiBeneficiaryData.upiId || isUpiVerifiedSim === true}> {formLoading && isUpiVerifiedSim === null ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : null} {isUpiVerifiedSim === true ? <CheckCircle className="h-4 w-4 text-green-500"/> : (isUpiVerifiedSim === false ? <XCircle className="h-4 w-4 text-red-500"/> : null)} {isUpiVerifiedSim === null ? 'Verify' : (isUpiVerifiedSim === true ? 'Verified' : 'Retry Verify')} </Button> </div> {isUpiVerifiedSim === true && <p className="text-xs text-green-600 dark:text-green-400">UPI ID Verified. Name: {newUpiBeneficiaryData.accountHolderName || 'Fetched Name (Simulated)'}</p>} {isUpiVerifiedSim === false && <p className="text-xs text-red-600 dark:text-red-400">Could not verify UPI ID. Please check and try again.</p>} <div className="flex justify-end gap-3 pt-3"> <Button type="button" variant="outline" onClick={() => setActiveUpiSubTab("ViewUpiBeneficiaries")} disabled={formLoading}>Cancel</Button> <Button type="submit" disabled={formLoading || !isUpiVerifiedSim}> {formLoading ? <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Adding...</> : 'Add UPI ID'} </Button> </div> </form> </motion.div> )} </motion.div> )}

          {activeServiceTab === "Recharge" && renderPlaceholder("Mobile & DTH Recharge")}
          {activeServiceTab === "DMT" && renderPlaceholder("Domestic Money Transfer")}
          {activeServiceTab === "BillPayments" && renderPlaceholder("Utility Bill Payments")}
          {activeServiceTab === "CreditCardPayment" && renderPlaceholder("Credit Card Bill Payment")}
          {activeServiceTab === "Transactions" && ( <motion.div key="transactions-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm p-4 md:p-6"> <h2 className="text-xl font-semibold text-foreground mb-4">All Transactions</h2> {loading ?  <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary"/></div> : transactions.length === 0 ? <div className="text-center py-10 text-muted-foreground">No transactions found.</div> : <DataTable data={transactions} columns={[ { key: "transactionTime", header: "Date", render: (row: Transaction) => new Date(row.transactionTime).toLocaleDateString() }, { key: "description", header: "Description/Beneficiary", render: (row: Transaction) => row.description || row.beneficiaryName || row.beneficiaryIdentifier || 'N/A', className: "min-w-[200px]" }, { key: "amount", header: "Amount", render: (row: Transaction) => `₹${Number(row.amount).toFixed(2)}` }, { key: "transactionType", header: "Service", render: (row: Transaction) => row.transactionType.replace(/([A-Z])/g, ' $1').trim() }, { key: "transactionStatus", header: "Status", render: (row: Transaction) => ( <span className={`px-2 py-1 rounded text-xs font-medium ${ row.transactionStatus === 'COMPLETED' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' : row.transactionStatus === 'PENDING' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' }`}> {row.transactionStatus} </span> ) }, ]} /> } </motion.div> )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ServicesPage;
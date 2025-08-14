"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, User, Hash, Building, CheckCircle, XCircle, Banknote, Trash2, Loader2,
  ArrowRightLeft, Zap, Wifi, Smartphone, CreditCard as CreditCardIcon, ListChecks, Send, AtSign,
  ArrowLeft, Plane, Film
} from "lucide-react";
import MainLayout from "../components/MainLayout";
import { motion, AnimatePresence } from "framer-motion";
import DataTable from "../components/DataTable";
import { useToast } from "../hooks/use-toast";
import { useRouter } from "next/navigation";
import TransactionSuccessModal from "../components/TransactionSuccessfull";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";

// --- Interface Definitions (same as before) ---
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
  transactionType: 'NEFT' | 'IMPS' | 'UPI' | 'RECHARGE' | 'BILL_PAYMENT' | 'DMT' | 'CREDIT_CARD_PAYMENT' | 'FLIGHTS' | 'MOVIES'; 
  transactionStatus: 'PENDING' | 'COMPLETED' | 'FAILED'; 
  transactionTime: string; 
  beneficiaryName?: string; 
  beneficiaryIdentifier?: string; 
  description?: string; 
}

interface TransactionDetailsForModal { 
  amount: number; 
  beneficiaryName: string; 
  accountNumber: string; 
  transactionId: string; 
  transactionType: 'NEFT' | 'IMPS' | 'UPI' | string; 
  timestamp: string; 
}

type ServiceTabId = "IMPS" | "UPI" | "Recharge" | "DMT" | "BillPayments" | "CreditCardPayment" | "Flights" | "MovieTickets" | "Transactions";

interface ServiceDefinition { 
  id: ServiceTabId; 
  label: string; 
  icon: React.ElementType; 
  description: string; 
}

const services: ServiceDefinition[] = [
  { id: "IMPS", label: "Bank Transfer", icon: ArrowRightLeft, description: "IMPS, NEFT, RTGS payments." },
  { id: "UPI", label: "UPI Payment", icon: AtSign, description: "Send money via UPI ID or QR." },
  { id: "Recharge", label: "Recharges", icon: Smartphone, description: "Mobile, DTH, and data recharges." },
  { id: "DMT", label: "Money Transfer", icon: Send, description: "Domestic Money Transfers." },
  { id: "BillPayments", label: "Bill Payments", icon: Zap, description: "Electricity, water, gas, etc." },
  { id: "CreditCardPayment", label: "Credit Card Bill", icon: CreditCardIcon, description: "Pay your credit card bills." },
  { id: "Flights", label: "Book Flights", icon: Plane, description: "Search and book domestic & international flights." },
  { id: "MovieTickets", label: "Movie Tickets", icon: Film, description: "Book tickets for the latest movies." },
  { id: "Transactions", label: "All Transactions", icon: ListChecks, description: "View your transaction history." },
];

type ImpsSubTab = "ViewBankBeneficiaries" | "AddBankBeneficiary";
type UpiSubTab = "ViewUpiBeneficiaries" | "AddUpiBeneficiary";

const ServicesPage = () => {
  const [selectedService, setSelectedService] = useState<ServiceTabId | null>(null);
  const [activeImpsSubTab, setActiveImpsSubTab] = useState<ImpsSubTab>("ViewBankBeneficiaries");
  const [activeUpiSubTab, setActiveUpiSubTab] = useState<UpiSubTab>("ViewUpiBeneficiaries");

  const [searchQuery, setSearchQuery] = useState("");
  const [bankBeneficiaries, setBankBeneficiaries] = useState<BankBeneficiary[]>([]);
  const [upiBeneficiaries, setUpiBeneficiaries] = useState<UpiBeneficiary[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const [transactionDetails, setTransactionDetails] = useState<TransactionDetailsForModal>({
    amount: 0, 
    beneficiaryName: "", 
    accountNumber: "", 
    transactionId: "",
    transactionType: "IMPS", 
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
    accountHolderName: "" 
  });
  const [isUpiVerifiedSim, setIsUpiVerifiedSim] = useState<boolean | null>(null);

  const [isVerificationPopupOpen, setIsVerificationPopupOpen] = useState(false);
  const [beneficiaryToVerify, setBeneficiaryToVerify] = useState<BankBeneficiary | null>(null);

  const handleVerificationClick = (beneficiary: BankBeneficiary) => {
    setBeneficiaryToVerify(beneficiary);
    setIsVerificationPopupOpen(true);
  };

  const handleConfirmVerification = async () => {
    if (!beneficiaryToVerify) return;

    setFormLoading(true);
    try {
      const response = await fetch('/api/verify-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountNumber: beneficiaryToVerify.accountNumber,
          ifsc: beneficiaryToVerify.ifscCode,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: result.message,
        });
        fetchBankBeneficiaries(false);
      } else {
        throw new Error(result.message || 'Failed to verify account');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify account.",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
      setIsVerificationPopupOpen(false);
      setBeneficiaryToVerify(null);
    }
  };

  const setRowLoading = (id: string, isLoading: boolean) => setActionLoading(prev => ({ ...prev, [id]: isLoading }));

  const fetchBankBeneficiaries = useCallback(async (showLoading = true) => { 
    if (showLoading) setLoading(true); 
    try { 
      const response = await fetch('/api/beneficiaries'); 
      if (!response.ok) { 
        throw new Error('Failed to fetch beneficiaries'); 
      } 
      const data = await response.json(); 
      setBankBeneficiaries(data.bankBeneficiaries); 
    } catch (error) { 
      console.error("Error fetching bank beneficiaries:", error); 
      toast({ 
        title: "Error", 
        description: "Failed to load bank beneficiaries.", 
        variant: "destructive" 
      }); 
    } finally { 
      if (showLoading) setLoading(false); 
    } 
  }, [toast]);

  const fetchUpiBeneficiaries = useCallback(async (showLoading = true) => { 
    if (showLoading) setLoading(true); 
    try { 
      const response = await fetch('/api/beneficiaries'); 
      if (!response.ok) { 
        throw new Error('Failed to fetch UPI beneficiaries'); 
      } 
      const data = await response.json(); 
      setUpiBeneficiaries(data.upiBeneficiaries); 
    } catch (error) { 
      console.error("Error fetching UPI beneficiaries:", error); 
      toast({ 
        title: "Error", 
        description: "Failed to load UPI beneficiaries.", 
        variant: "destructive" 
      }); 
    } finally { 
      if (showLoading) setLoading(false); 
    } 
  }, [toast]);

  const fetchTransactions = useCallback(async () => { 
    setLoading(true); 
    const dummyTransactions: Transaction[] = [ 
      {
        id: 't1', 
        amount: 100, 
        chargesAmount: 2, 
        transactionType: 'IMPS', 
        transactionStatus: 'COMPLETED', 
        transactionTime: new Date().toISOString(), 
        beneficiaryName: 'Alice Smith (Bank)', 
        beneficiaryIdentifier: '...9012'
      }, 
      {
        id: 't2', 
        amount: 50, 
        chargesAmount: 1, 
        transactionType: 'UPI', 
        transactionStatus: 'PENDING', 
        transactionTime: new Date().toISOString(), 
        beneficiaryName: 'Bob J. (UPI)', 
        beneficiaryIdentifier: 'bob.john@okaxis'
      }, 
    ]; 
    setTransactions(dummyTransactions); 
    setLoading(false); 
  }, []);

  useEffect(() => { 
    if (selectedService === "IMPS") fetchBankBeneficiaries(); 
    else if (selectedService === "UPI") fetchUpiBeneficiaries(); 
    else if (selectedService === "Transactions") fetchTransactions(); 
    setSearchQuery(""); 
  }, [selectedService, fetchBankBeneficiaries, fetchUpiBeneficiaries, fetchTransactions]);

  const handleServiceSelect = (serviceId: ServiceTabId) => { 
    setSelectedService(serviceId); 
    if (serviceId === "IMPS") setActiveImpsSubTab("ViewBankBeneficiaries"); 
    if (serviceId === "UPI") setActiveUpiSubTab("ViewUpiBeneficiaries"); 
  };

  const handleGoBackToGrid = () => setSelectedService(null);

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
      toast({ 
        title: "Error", 
        description: "Account numbers do not match.", 
        variant: "destructive" 
      }); 
      setFormLoading(false); 
      return; 
    }     
     
    try { 
      const response = await fetch('/api/beneficiaries', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
        }, 
        body: JSON.stringify({ 
          ...newBankBeneficiaryData, 
        }), 
      }); 
      if (!response.ok) { 
        const errorData = await response.json(); 
        throw new Error(errorData.message || 'Failed to add beneficiary'); 
      } 
      toast({ 
        title: "Success", 
        description: "Bank beneficiary added successfully.", 
      }); 
      setNewBankBeneficiaryData({ 
        accountNumber: "", 
        confirmAccountNumber: "", 
        accountHolderName: "", 
        ifscCode: "", 
        transactionType: "IMPS" 
      }); 
      setIsBankAccountVerifiedSim(null); 
      setActiveImpsSubTab("ViewBankBeneficiaries"); 
      fetchBankBeneficiaries(false); 
    } catch (error: any) { 
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add beneficiary.", 
        variant: "destructive" 
      }); 
    } finally { 
      setFormLoading(false); 
    } 
  };

  const handleUpiInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const { name, value } = e.target; 
    setNewUpiBeneficiaryData(prev => ({ ...prev, [name]: value })); 
    setIsUpiVerifiedSim(null); 
  };

  const handleVerifyUpiSimulated = async () => { 
    if (!newUpiBeneficiaryData.upiId.match(/^[\w.-]+@[\w.-]+$/)) { 
      toast({ 
        title: "Error", 
        description: "Invalid UPI ID format.", 
        variant: "destructive" 
      }); 
      setIsUpiVerifiedSim(false); 
      return; 
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
      setNewUpiBeneficiaryData(prev => ({
        ...prev, 
        accountHolderName: `Mock User ${Math.floor(Math.random()*100)}`
      })); 
    } 
  };

  const handleAddUpiBeneficiary = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    setFormLoading(true); 
    if (!isUpiVerifiedSim) { 
      toast({ 
        title: "Error", 
        description: "Please verify UPI ID before adding.", 
        variant: "destructive" 
      }); 
      setFormLoading(false); 
      return; 
    } 
    try { 
      const response = await fetch('/api/beneficiaries', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
        }, 
        body: JSON.stringify({ 
          upiId: newUpiBeneficiaryData.upiId, 
          accountHolderName: newUpiBeneficiaryData.accountHolderName, 
          transactionType: 'UPI', 
        }), 
      }); 
      if (!response.ok) { 
        const errorData = await response.json(); 
        throw new Error(errorData.message || 'Failed to add UPI beneficiary'); 
      } 
      toast({ 
        title: "Success", 
        description: "UPI beneficiary added successfully.", 
      }); 
      setNewUpiBeneficiaryData({ 
        upiId: "", 
        accountHolderName: "" 
      }); 
      setIsUpiVerifiedSim(null); 
      setActiveUpiSubTab("ViewUpiBeneficiaries"); 
      fetchUpiBeneficiaries(false); 
    } catch (error: any) { 
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add UPI beneficiary.", 
        variant: "destructive" 
      }); 
    } finally { 
      setFormLoading(false); 
    } 
  };

  const handleAmountChange = (id: string, amount: string) => { 
    const validAmount = amount.match(/^\d*\.?\d*$/); 
    if (validAmount) setPayoutAmounts(prev => ({ ...prev, [id]: amount })); 
  };

  const handlePay = async (beneficiaryId: string, type: 'BANK' | 'UPI') => { 
    const amountStr = payoutAmounts[beneficiaryId] || ""; 
    const amount = parseFloat(amountStr); 

    if (isNaN(amount) || amount <= 0) { 
      toast({ 
        title: "Error", 
        description: "Please enter a valid amount.", 
        variant: "destructive" 
      }); 
      return; 
    } 

    setRowLoading(beneficiaryId, true); 
    try {
      const response = await fetch('/api/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          beneficiaryId: beneficiaryId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Payout initiated successfully.",
        });
        fetchBankBeneficiaries(false);
        setPayoutAmounts(prev => ({ ...prev, [beneficiaryId]: "" }));
      } else {
        throw new Error(result.message || 'Failed to initiate payout');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate payout.",
        variant: "destructive",
      });
    } finally {
      setRowLoading(beneficiaryId, false);
    }
  };

  interface SubTabButtonProps { 
    label: string; 
    currentSubTab: string; 
    onClick: () => void; 
  }

  const SubTabButton: React.FC<SubTabButtonProps> = ({ label, currentSubTab, onClick }) => ( 
    <button 
      onClick={onClick} 
      className={`px-4 py-2 text-sm font-medium focus:outline-none rounded-md transition-colors ${
        currentSubTab === label.replace(/\s+/g, '') ? 
        "bg-primary text-primary-foreground" : 
        "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    > 
      {label} 
    </button> 
  );

  const renderPlaceholder = (serviceName: string, customMessage?: string) => ( 
    <motion.div 
      key={`${serviceName}-placeholder`} 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }} 
      className="text-center py-12 md:py-20 text-muted-foreground bg-card p-6 rounded-xl border border-border/40 shadow-sm"
    > 
      <ListChecks className="h-16 w-16 mx-auto mb-4 text-primary/50" /> 
      <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">{serviceName}</h2> 
      <p>{customMessage || "This feature is under development and will be available soon."}</p> 
    </motion.div> 
  );

  return (
    <MainLayout location="/Payouts">
      <AlertDialog open={isVerificationPopupOpen} onOpenChange={setIsVerificationPopupOpen}>
        <AlertDialogContent className="dark:text-black">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to verify this account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will trigger a verification process for the account number: {beneficiaryToVerify?.accountNumber}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmVerification} disabled={formLoading}>
              {formLoading ? 'Verifying...' : 'Verify'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TransactionSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        transactionDetails={transactionDetails}
      />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h1 className="text-2xl font-semibold">
              {selectedService ? services.find(s => s.id === selectedService)?.label : "All Services"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {selectedService ? services.find(s => s.id === selectedService)?.description : "Choose a service to get started."}
            </p>
          </motion.div>
          {selectedService && (
            <motion.button
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: 20 }} 
              onClick={handleGoBackToGrid}
              className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
            > 
              <ArrowLeft className="h-4 w-4" /> Back to Services 
            </motion.button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!selectedService ? (
            <motion.div
              key="service-grid" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5"
            >
              {services.map((service, index) => (
                <motion.button
                  key={service.id}
                  onClick={() => handleServiceSelect(service.id)}
                  className={`
                    bg-card rounded-xl p-4 md:p-5 text-left shadow-sm
                    border-2 border-blue-300 dark:border-blue-700 
                    hover:border-purple-400 dark:hover:border-purple-600 
                    transition-all duration-200 group 
                    focus:outline-none focus:ring-2 focus:ring-primary 
                    focus:ring-offset-2 focus:ring-offset-background
                    flex flex-col justify-between h-full 
                  `}
                  whileHover={{ y: -5, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)" }}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  <div>
                    <div className="p-2.5 bg-primary/10 group-hover:bg-primary/20 rounded-lg mb-2 md:mb-3 transition-colors inline-block">
                      <service.icon className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                    </div>
                    <h2 className="text-sm md:text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-tight mb-1.5">
                      {service.label}
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 sm:line-clamp-3">
                    {service.description}
                  </p>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key={selectedService} 
              initial={{ opacity: 0, x: 30 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -30 }} 
              transition={{ duration: 0.3, type: "tween" }}
              className="mt-2 md:mt-4"
            >
              {selectedService === "IMPS" && (
                <motion.div key="imps-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <div className="mb-4 p-4 bg-card border border-border/40 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Bank Transfers (IMPS)</h2>
                      <p className="text-sm text-muted-foreground">Manage bank account beneficiaries and send money.</p>
                    </div>
                    <div className="flex space-x-2">
                      <SubTabButton 
                        label="View Beneficiaries" 
                        currentSubTab={activeImpsSubTab} 
                        onClick={() => setActiveImpsSubTab("ViewBankBeneficiaries")} 
                      />
                      <SubTabButton 
                        label="Add Beneficiary" 
                        currentSubTab={activeImpsSubTab} 
                        onClick={() => setActiveImpsSubTab("AddBankBeneficiary")} 
                      />
                    </div>
                  </div>

                  {activeImpsSubTab === "ViewBankBeneficiaries" && (
                    <motion.div 
                      key="view-bank-beneficiaries" 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm p-4 md:p-6"
                    >
                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <input 
                          type="text" 
                          placeholder="Search by name, account, IFSC..." 
                          className="pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" 
                          value={searchQuery} 
                          onChange={(e) => setSearchQuery(e.target.value)} 
                        />
                      </div>

                      {loading ? (
                        <div className="text-center py-10">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary"/>
                        </div>
                      ) : filteredBankBeneficiaries.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                          No bank beneficiaries found.
                        </div>
                      ) : (
                        <DataTable 
                          data={filteredBankBeneficiaries} 
                          columns={[
                            { 
                              key: "accountHolderName", 
                              header: "Beneficiary Name", 
                              className: "min-w-[150px]" 
                            },
                            { 
                              key: "accountNumber", 
                              header: "Account Number", 
                              render: (row: BankBeneficiary) => `${row.accountNumber}`,
                              className: "min-w-[120px]" 
                            },
                            { 
                              key: "ifscCode", 
                              header: "IFSC Code", 
                              render: (row: BankBeneficiary) => `${row.ifscCode}`,
                              className: "min-w-[100px]" 
                            },
                            { 
                              key: "transactionType", 
                              header: "Type", 
                              className: "min-w-[80px]" 
                            },
                            { 
                              key: "isVerified", 
                              header: "Status", 
                              className: "min-w-[100px]",
                              render: (row: BankBeneficiary) => row.isVerified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">
                                  <CheckCircle className="h-3 w-3" /> Verified
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleVerificationClick(row)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-500/30"
                                >
                                  <XCircle className="h-3 w-3" /> Not Verified
                                </button>
                              )
                            },
                            { 
                              key: "amount", 
                              header: "Amount (₹)", 
                              className: "min-w-[130px]", 
                              render: (row: BankBeneficiary) => (
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                                  <input 
                                    type="text" 
                                    inputMode="decimal" 
                                    value={payoutAmounts[row.id] || ""} 
                                    onChange={(e) => handleAmountChange(row.id, e.target.value)} 
                                    disabled={ actionLoading[row.id]} 
                                    className="pl-6 pr-2 py-1 w-full bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm dark:text-black" 
                                    placeholder="0.00"
                                  />
                                </div>
                              )
                            },
                            { 
                              key: "actions", 
                              header: "Actions", 
                              className: "min-w-[100px]", 
                              render: (row: BankBeneficiary) => (
                                <button 
                                  onClick={() => handlePay(row.id, 'BANK')} 
                                  disabled={ !(parseFloat(payoutAmounts[row.id] || "0") > 0) || actionLoading[row.id]} 
                                  className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {actionLoading[row.id] ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Banknote className="h-3 w-3" />
                                  )}
                                  Pay
                                </button>
                              )
                            },
                          ]} 
                        />
                      )}
                    </motion.div>
                  )}

                  {activeImpsSubTab === "AddBankBeneficiary" && (
                    <motion.div 
                      key="add-bank-beneficiary" 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="max-w-2xl mx-auto bg-card p-6 sm:p-8 rounded-xl border border-border/40 shadow-sm"
                    >
                      <h3 className="text-lg font-semibold mb-6 text-foreground">Add New Bank Beneficiary</h3>
                      <form onSubmit={handleAddBankBeneficiary} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label htmlFor="accountNumber" className="block text-sm font-medium text-muted-foreground mb-1">
                              Account Number <span className="text-destructive">*</span>
                            </label>
                            <div className="relative">
                              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                              <input 
                                type="text" 
                                id="accountNumber" 
                                name="accountNumber" 
                                value={newBankBeneficiaryData.accountNumber} 
                                onChange={handleBankInputChange} 
                                required 
                                className="pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400" 
                                placeholder="Enter Account Number" 
                              />
                            </div>
                          </div>
                          <div>
                            <label htmlFor="confirmAccountNumber" className="block text-sm font-medium text-muted-foreground mb-1">
                              Confirm Account No. <span className="text-destructive">*</span>
                            </label>
                            <div className="relative">
                              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                              <input 
                                type="text" 
                                id="confirmAccountNumber" 
                                name="confirmAccountNumber" 
                                value={newBankBeneficiaryData.confirmAccountNumber} 
                                onChange={handleBankInputChange} 
                                required 
                                className={`pl-10 pr-4 py-2 w-full bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 ${
                                  newBankBeneficiaryData.accountNumber && 
                                  newBankBeneficiaryData.confirmAccountNumber && 
                                  newBankBeneficiaryData.accountNumber !== newBankBeneficiaryData.confirmAccountNumber ? 
                                  'border-destructive ring-destructive' : 'border-border' 
                                }`}
                                placeholder="Confirm Account Number" 
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label htmlFor="ifscCode" className="block text-sm font-medium text-muted-foreground mb-1">
                              IFSC Code <span className="text-destructive">*</span>
                            </label>
                            <div className="relative">
                              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                              <input 
                                type="text" 
                                id="ifscCode" 
                                name="ifscCode" 
                                value={newBankBeneficiaryData.ifscCode} 
                                onChange={handleBankInputChange} 
                                required 
                                className="uppercase pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400" 
                                placeholder="Enter IFSC Code" 
                              />
                            </div>
                          </div>
                          <div>
                            <label htmlFor="accountHolderName" className="block text-sm font-medium text-muted-foreground mb-1">
                              Account Holder Name <span className="text-destructive">*</span>
                            </label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                              <input 
                                type="text" 
                                id="accountHolderName" 
                                name="accountHolderName" 
                                value={newBankBeneficiaryData.accountHolderName} 
                                onChange={handleBankInputChange} 
                                required 
                                className="pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400" 
                                placeholder="As per bank records" 
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setActiveImpsSubTab("ViewBankBeneficiaries")}
                            className="dark:text-black" 
                            disabled={formLoading}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={formLoading}>
                            {formLoading ? (
                              <>
                                <Loader2 className="animate-spin h-4 w-4 mr-2" /> 
                                Adding...
                              </>
                            ) : (
                              'Add Beneficiary'
                            )}
                          </Button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {selectedService === "UPI" && (
                <motion.div key="upi-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <div className="mb-4 p-4 bg-card border border-border/40 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">UPI Payments</h2>
                      <p className="text-sm text-muted-foreground">Manage UPI IDs and send money instantly.</p>
                    </div>
                    <div className="flex space-x-2">
                      <SubTabButton 
                        label="View UPI IDs" 
                        currentSubTab={activeUpiSubTab} 
                        onClick={() => setActiveUpiSubTab("ViewUpiBeneficiaries")} 
                      />
                      <SubTabButton 
                        label="Add UPI ID" 
                        currentSubTab={activeUpiSubTab} 
                        onClick={() => setActiveUpiSubTab("AddUpiBeneficiary")} 
                      />
                    </div>
                  </div>

                  {activeUpiSubTab === "ViewUpiBeneficiaries" && (
                    <motion.div 
                      key="view-upi-ids" 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm p-4 md:p-6"
                    >
                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <input 
                          type="text" 
                          placeholder="Search by UPI ID or name..." 
                          className="pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" 
                          value={searchQuery} 
                          onChange={(e) => setSearchQuery(e.target.value)} 
                        />
                      </div>

                      {loading ? (
                        <div className="text-center py-10">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary"/>
                        </div>
                      ) : filteredUpiBeneficiaries.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                          No UPI beneficiaries found.
                        </div>
                      ) : (
                        <DataTable 
                          data={filteredUpiBeneficiaries} 
                          columns={[
                            { 
                              key: "accountHolderName", 
                              header: "Beneficiary Name", 
                              className: "min-w-[150px]" 
                            },
                            { 
                              key: "upiId", 
                              header: "UPI ID", 
                              className: "min-w-[200px]" 
                            },
                            { 
                              key: "isVerified", 
                              header: "Status", 
                              className: "min-w-[100px]", 
                              render: (row: UpiBeneficiary) => row.isVerified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">
                                  <CheckCircle className="h-3 w-3" /> Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                                  <XCircle className="h-3 w-3" /> Not Verified
                                </span>
                              )
                            },
                            { 
                              key: "amount", 
                              header: "Amount (₹)", 
                              className: "min-w-[130px]", 
                              render: (row: UpiBeneficiary) => (
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                                  <input 
                                    type="text" 
                                    inputMode="decimal" 
                                    value={payoutAmounts[row.id] || ""} 
                                    onChange={(e) => handleAmountChange(row.id, e.target.value)} 
                                    disabled={!row.isVerified || actionLoading[row.id]} 
                                    className="pl-6 pr-2 py-1 w-full bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm" 
                                    placeholder="0.00"
                                  />
                                </div>
                              )
                            },
                            { 
                              key: "actions", 
                              header: "Actions", 
                              className: "min-w-[100px]", 
                              render: (row: UpiBeneficiary) => (
                                <button 
                                  onClick={() => handlePay(row.id, 'UPI')} 
                                  disabled={!row.isVerified || !(parseFloat(payoutAmounts[row.id] || "0") > 0) || actionLoading[row.id]} 
                                  className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {actionLoading[row.id] ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Banknote className="h-3 w-3" />
                                  )}
                                  Pay
                                </button>
                              )
                            },
                          ]} 
                        />
                      )}
                    </motion.div>
                  )}

                  {activeUpiSubTab === "AddUpiBeneficiary" && (
                    <motion.div 
                      key="add-upi-beneficiary" 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="max-w-xl mx-auto bg-card p-6 sm:p-8 rounded-xl border border-border/40 shadow-sm"
                    >
                      <h3 className="text-lg font-semibold mb-6 text-foreground">Add New UPI ID</h3>
                      <form onSubmit={handleAddUpiBeneficiary} className="space-y-5">
                        <div>
                          <label htmlFor="upiId" className="block text-sm font-medium text-muted-foreground mb-1">
                            UPI ID (VPA) <span className="text-destructive">*</span>
                          </label>
                          <div className="relative">
                            <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <input 
                              type="text" 
                              id="upiId" 
                              name="upiId" 
                              value={newUpiBeneficiaryData.upiId} 
                              onChange={handleUpiInputChange} 
                              required 
                              className="pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" 
                              placeholder="yourname@bank" 
                            />
                          </div>
                        </div>

                        <div className="flex items-end gap-3">
                          <div className="flex-grow">
                            <label htmlFor="upiAccountHolderName" className="block text-sm font-medium text-muted-foreground mb-1">
                              Beneficiary Name (Optional)
                            </label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                              <input 
                                type="text" 
                                id="upiAccountHolderName" 
                                name="accountHolderName" 
                                value={newUpiBeneficiaryData.accountHolderName} 
                                onChange={handleUpiInputChange} 
                                className="pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" 
                                placeholder="Name for your reference" 
                              />
                            </div>
                          </div>
                          <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={handleVerifyUpiSimulated} 
                            disabled={formLoading || !newUpiBeneficiaryData.upiId || isUpiVerifiedSim === true}
                          >
                            {formLoading && isUpiVerifiedSim === null ? (
                              <Loader2 className="animate-spin h-4 w-4 mr-2"/>
                            ) : null}
                            {isUpiVerifiedSim === true ? (
                              <CheckCircle className="h-4 w-4 text-green-500"/>
                            ) : (isUpiVerifiedSim === false ? (
                              <XCircle className="h-4 w-4 text-red-500"/>
                            ) : null)}
                            {isUpiVerifiedSim === null ? 'Verify' : (isUpiVerifiedSim === true ? 'Verified' : 'Retry Verify')}
                          </Button>
                        </div>

                        {isUpiVerifiedSim === true && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            UPI ID Verified. Name: {newUpiBeneficiaryData.accountHolderName || 'Fetched Name (Simulated)'}
                          </p>
                        )}
                        {isUpiVerifiedSim === false && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            Could not verify UPI ID. Please check and try again.
                          </p>
                        )}

                        <div className="flex justify-end gap-3 pt-3">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setActiveUpiSubTab("ViewUpiBeneficiaries")} 
                            disabled={formLoading}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={formLoading || !isUpiVerifiedSim}>
                            {formLoading ? (
                              <>
                                <Loader2 className="animate-spin h-4 w-4 mr-2" /> 
                                Adding...
                              </>
                            ) : (
                              'Add UPI ID'
                            )}
                          </Button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {selectedService === "Recharge" && renderPlaceholder("Mobile & DTH Recharge")}
              {selectedService === "DMT" && renderPlaceholder("Domestic Money Transfer")}
              {selectedService === "BillPayments" && renderPlaceholder("Utility Bill Payments")}
              {selectedService === "CreditCardPayment" && renderPlaceholder("Credit Card Bill Payment")}
              {selectedService === "Flights" && renderPlaceholder("Book Flights", "Flight booking feature is coming soon!")}
              {selectedService === "MovieTickets" && renderPlaceholder("Movie Tickets", "Movie ticket booking feature is coming soon!")}
              {selectedService === "Transactions" && (
                <motion.div 
                  key="transactions-list" 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm p-4 md:p-6"
                >
                  <h2 className="text-xl font-semibold text-foreground mb-4">All Transactions</h2>
                  {loading ? (
                    <div className="text-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary"/>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      No transactions found.
                    </div>
                  ) : (
                    <DataTable 
                      data={transactions} 
                      columns={[
                        { 
                          key: "transactionTime", 
                          header: "Date", 
                          render: (row: Transaction) => new Date(row.transactionTime).toLocaleDateString() 
                        },
                        { 
                          key: "description", 
                          header: "Description/Beneficiary", 
                          render: (row: Transaction) => row.description || row.beneficiaryName || row.beneficiaryIdentifier || 'N/A', 
                          className: "min-w-[200px]" 
                        },
                        { 
                          key: "amount", 
                          header: "Amount", 
                          render: (row: Transaction) => `₹${Number(row.amount).toFixed(2)}` 
                        },
                        { 
                          key: "transactionType", 
                          header: "Service", 
                          render: (row: Transaction) => row.transactionType.replace(/([A-Z])/g, ' $1').trim() 
                        },
                        { 
                          key: "transactionStatus", 
                          header: "Status", 
                          render: (row: Transaction) => (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              row.transactionStatus === 'COMPLETED' ? 
                              'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 
                              row.transactionStatus === 'PENDING' ? 
                              'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' : 
                              'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' 
                            }`}>
                              {row.transactionStatus}
                            </span>
                          ) 
                        },
                      ]} 
                    />
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
};

export default ServicesPage;

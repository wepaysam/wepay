"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, User, Hash, Building, CheckCircle, XCircle, Banknote, Trash2, Loader2,
  ArrowRightLeft, Zap, Wifi, Smartphone, CreditCard as CreditCardIcon, ListChecks, Send, AtSign,
  ArrowLeft, Plane, Film, Phone
} from "lucide-react";
import DashboardLayout from "../dashboard/layout";
import { motion, AnimatePresence } from "framer-motion";
import DataTable from "../components/DataTable";
import { useToast } from "../hooks/use-toast";
import { useGlobalContext } from "../context/GlobalContext";
import { useRouter } from "next/navigation";
import { generateReceiptPDF } from "../utils/pdfGenerator";
import TransactionSuccessModal from "../components/TransactionSuccessfull";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";

import PaymentGatewayPopup from "../components/PaymentGatewayPopup";
import BankTransferBeneficiaryModal from "../components/BankTransferBeneficiaryModal";
import DmtPaymentConfirmationPopup from "../components/DmtPaymentConfirmationPopup";
import UpiPaymentConfirmationPopup from "../components/UpiPaymentConfirmationPopup";
import CreditCardPaymentForm from "../components/CreditCardPaymentForm";

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

interface DmtBeneficiary { 
  id: string; 
  accountNumber: string; 
  accountHolderName: string; 
  ifscCode?: string; 
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
  const [dmtBeneficiaries, setDmtBeneficiaries] = useState<DmtBeneficiary[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isGatewayPopupOpen, setIsGatewayPopupOpen] = useState(false);
  const [isBankTransferBeneficiaryModalOpen, setIsBankTransferBeneficiaryModalOpen] = useState(false);
  const [isDmtConfirmationPopupOpen, setIsDmtConfirmationPopupOpen] = useState(false);
  const [isUpiConfirmationPopupOpen, setIsUpiConfirmationPopupOpen] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<BankBeneficiary | UpiBeneficiary | DmtBeneficiary | null>(null);

  const [successfulTransactionData, setSuccessfulTransactionData] = useState<any>(null);

  const [payoutAmounts, setPayoutAmounts] = useState<{ [key: string]: string }>({});
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  const { toast } = useToast();
  const router = useRouter();
  const { user } = useGlobalContext();

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
  const [isNameCheckLoading, setIsNameCheckLoading] = useState(false);

  const [isVerificationPopupOpen, setIsVerificationPopupOpen] = useState(false);
  const [beneficiaryToVerify, setBeneficiaryToVerify] = useState<BankBeneficiary | DmtBeneficiary | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [beneficiaryToDelete, setBeneficiaryToDelete] = useState<BankBeneficiary | UpiBeneficiary | DmtBeneficiary | null>(null);

  const handleVerificationClick = (beneficiary: BankBeneficiary | DmtBeneficiary) => {
    setBeneficiaryToVerify(beneficiary);
    setIsVerificationPopupOpen(true);
  };

  const handleDeleteClick = (beneficiary: BankBeneficiary | UpiBeneficiary | DmtBeneficiary) => {
    setBeneficiaryToDelete(beneficiary);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!beneficiaryToDelete) return;

    setFormLoading(true);
    try {
      let url = '';
      let type = '';

      if ('ifscCode' in beneficiaryToDelete && !('transactionType' in beneficiaryToDelete)) {
        type = 'dmt';
        url = `/api/dmt-beneficiaries?id=${beneficiaryToDelete.id}`;
      } else if ('accountNumber' in beneficiaryToDelete) {
        type = 'bank';
        url = `/api/beneficiaries?id=${beneficiaryToDelete.id}&type=bank`;
      } else {
        type = 'upi';
        url = `/api/beneficiaries?id=${beneficiaryToDelete.id}&type=upi`;
      }

      const response = await fetch(url, { method: 'DELETE' });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: result.message,
        });
        if (type === 'dmt') {
          fetchDmtBeneficiaries(false);
        } else if (type === 'bank') {
          fetchBankBeneficiaries(false);
        } else {
          fetchUpiBeneficiaries(false);
        }
      } else {
        throw new Error(result.message || `Failed to delete ${type} beneficiary`);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete beneficiary.",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
      setIsDeleteDialogOpen(false);
      setBeneficiaryToDelete(null);
    }
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
          beneficiaryType: 'transactionType' in beneficiaryToVerify ? 'bank' : 'dmt',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: result.message,
        });
        fetchBankBeneficiaries(false);
        fetchDmtBeneficiaries(false);
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

  const fetchDmtBeneficiaries = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // In a real application, you would get the userId from your authentication context // Replace with actual user ID
      const response = await fetch(`/api/dmt-beneficiaries`);
      if (!response.ok) {
        throw new Error('Failed to fetch DMT beneficiaries');
      }
      const data = await response.json();
      setDmtBeneficiaries(data.dmtBeneficiaries);
    } catch (error) {
      console.error("Error fetching DMT beneficiaries:", error);
      toast({
        title: "Error",
        description: "Failed to load DMT beneficiaries.",
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
    else if (selectedService === "DMT") fetchDmtBeneficiaries();
    else if (selectedService === "Transactions") fetchTransactions(); 
    setSearchQuery(""); 
  }, [selectedService, fetchBankBeneficiaries, fetchUpiBeneficiaries, fetchDmtBeneficiaries, fetchTransactions]);

  const handleServiceSelect = (serviceId: ServiceTabId) => { 
    setSelectedService(serviceId); 
    if (serviceId === "IMPS") setActiveImpsSubTab("ViewBankBeneficiaries"); 
    if (serviceId === "UPI") setActiveUpiSubTab("ViewUpiBeneficiaries"); 
  };

  const clearBeneficiaryForms = () => {
    setNewBankBeneficiaryData({
      accountNumber: "",
      confirmAccountNumber: "",
      accountHolderName: "",
      ifscCode: "",
      transactionType: "IMPS"
    });
    setNewUpiBeneficiaryData({
      upiId: "",
      accountHolderName: ""
    });
    setIsBankAccountVerifiedSim(null);
    setIsUpiVerifiedSim(null);
  };

  const handleGoBackToGrid = () => {
    setSelectedService(null);
    clearBeneficiaryForms();
  };

  const filteredBankBeneficiaries = bankBeneficiaries.filter(b => 
    b.accountHolderName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.accountNumber.includes(searchQuery) || 
    (b.ifscCode && b.ifscCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredUpiBeneficiaries = upiBeneficiaries.filter(b => 
    b.accountHolderName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.upiId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDmtBeneficiaries = dmtBeneficiaries.filter(b => 
    b.accountHolderName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.accountNumber.includes(searchQuery) || 
    (b.ifscCode && b.ifscCode.toLowerCase().includes(searchQuery.toLowerCase()))
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
      if (error.message && error.message.toLowerCase().includes('already exist')) {
        clearBeneficiaryForms();
      }
    } finally { 
      setFormLoading(false); 
    } 
  };

  const handleUpiInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const { name, value } = e.target; 
    setNewUpiBeneficiaryData(prev => ({ ...prev, [name]: value })); 
    setIsUpiVerifiedSim(null); 
  };

  const handleCheckName = async () => {
    if (!newUpiBeneficiaryData.upiId.match(/^[\w.-]+@[\w.-]+$/)) {
      toast({
        title: "Error",
        description: "Invalid UPI ID format.",
        variant: "destructive",
      });
      return;
    }
    setIsNameCheckLoading(true);
    try {
      const response = await fetch('/api/aeronpay/verify-upi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vpa: newUpiBeneficiaryData.upiId }),
      });
      const result = await response.json();
      console.log("UPI Verification response:", result);
      if (response.ok && result.status === 'success') {
        setNewUpiBeneficiaryData((prev) => ({
          ...prev,
          accountHolderName: result.name,
        }));
        toast({
          title: "UPI Verification Successful",
          description: `Name: ${result.name}`,
        });
      } else {
        toast({
          title: "UPI Verification Failed",
          description: result.description || "Could not verify UPI ID.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during UPI verification.",
        variant: "destructive",
      });
    } finally {
      setIsNameCheckLoading(false);
    }
  };

  const handleVerify = () => {
    if (!newUpiBeneficiaryData.upiId.match(/^[\w.-]+@[\w.-]+$/)) {
      toast({
        title: "Error",
        description: "Invalid UPI ID format.",
        variant: "destructive",
      });
      setIsUpiVerifiedSim(false);
      return;
    }
    setIsUpiVerifiedSim(true);
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
      if (error.message && error.message.toLowerCase().includes('already exist')) {
        clearBeneficiaryForms();
      }
    } finally { 
      setFormLoading(false); 
    } 
  };

  const handleAmountChange = (id: string, amount: string) => { 
    const validAmount = amount.match(/^\d*\.?\d*$/); 
    if (validAmount) setPayoutAmounts(prev => ({ ...prev, [id]: amount })); 
  };

  // const initiateUpiPayment = async (beneficiary: UpiBeneficiary, amount: number) => {
  //   setRowLoading(beneficiary.id, true);
  //   try {
  //     const response = await fetch('/api/upi/payout', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         vpa: beneficiary.upiId,
  //         amount: amount,
  //         name: beneficiary.accountHolderName,
  //       }),
  //     });

  //     const result = await response.json();

  //     if (response.ok && result.data && (result.data.status === 'SUCCESS' || result.data.status === 'PENDING')) {
  //       setSuccessfulTransactionData({
  //         ...result,
  //         amount: amount,
  //         beneficiary: beneficiary,
  //         transactionType: 'UPI',
  //         timestamp: new Date().toISOString(),
  //       });
  //       setIsSuccessModalOpen(true);
  //       fetchUpiBeneficiaries(false); // Refresh UPI beneficiaries
  //       setPayoutAmounts(prev => ({ ...prev, [beneficiary.id]: "" }));
  //     } else if (!response.ok || (result.original && result.original.msg === "Sorry Insufficient wallet Balance")) {
  //       console.log("Error result in initiateUpiPayment:", result);
  //       if (result.original && result.original.msg === "Sorry Insufficient wallet Balance") {
  //         toast({
  //           title: "Error",
  //           description: "Insufficient wallet balance. Please add funds.",
  //           variant: "destructive",
  //         });
  //       } else {
  //         throw new Error(result.message || result.msg || 'Failed to initiate UPI payout');
  //       }
  //     }
  //   } catch (error: any) {
  //     toast({
  //       title: "Error",
  //       description: error.message || "Failed to initiate UPI payout.",
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setRowLoading(beneficiary.id, false);
  //     setSelectedBeneficiary(null);
  //   }
  // };

  const handlePay = async (beneficiary: BankBeneficiary | UpiBeneficiary | DmtBeneficiary) => {
    const amountStr = payoutAmounts[beneficiary.id] || "";
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount.",
        variant: "destructive"
      });
      return;
    }

    if (('upiId' in beneficiary) && !user?.upiPermissions?.enabled) {
      toast({
        title: "Error",
        description: "You are not currently allowed to use UPI service.",
        variant: "destructive"
      });
      return;
    }

    if (('accountNumber' in beneficiary && !('transactionType' in beneficiary)) && !user?.dmtPermissions?.enabled) {
      toast({
        title: "Error",
        description: "You are not currently allowed to use DMT service.",
        variant: "destructive"
      });
      return;
    }

    if (!('upiId' in beneficiary) && !('accountNumber' in beneficiary && !('transactionType' in beneficiary)) && !user?.impsPermissions?.enabled) {
      toast({
        title: "Error",
        description: "You are not currently allowed to use this service.",
        variant: "destructive"
      });
      return;
    }

    const UPI_LIMIT = 100000;
    const DMT_LIMIT = 200000;

    if ('upiId' in beneficiary) {
      if (amount > UPI_LIMIT) {
        toast({
          title: "Error",
          description: `UPI transaction limit is ₹${UPI_LIMIT.toLocaleString()}.`,
          variant: "destructive"
        });
        return;
      }
      setSelectedBeneficiary(beneficiary as UpiBeneficiary);
      setIsUpiConfirmationPopupOpen(true);
    } else if ('accountNumber' in beneficiary && !('transactionType' in beneficiary)) { // This is a DmtBeneficiary
      if (amount > DMT_LIMIT) {
        toast({
          title: "Error",
          description: `DMT transaction limit is ₹${DMT_LIMIT.toLocaleString()}.`,
          variant: "destructive"
        });
        return;
      }
      setSelectedBeneficiary(beneficiary as DmtBeneficiary);
      setIsDmtConfirmationPopupOpen(true);
    } else { // This is a BankBeneficiary (IMPS/NEFT)
      setSelectedBeneficiary(beneficiary as BankBeneficiary);
      setIsGatewayPopupOpen(true);
    }
  };

  const handleDmtGatewaySelect = async (gatewayDetails: { gateway: 'sevapay_weshubh' | 'sevapay_kelta', websiteUrl: string, transactionId: string }) => {
    setIsDmtConfirmationPopupOpen(false);
    if (!selectedBeneficiary || !('accountNumber' in selectedBeneficiary && !('transactionType' in selectedBeneficiary))) return; // Ensure it's a DmtBeneficiary

    const { gateway, websiteUrl, transactionId } = gatewayDetails;

    if (!websiteUrl.endsWith(transactionId)) {
        toast({
            title: "Error",
            description: "Wrong transaction ID. Please check the website URL and transaction ID.",
            variant: "destructive",
        });
        return;
    }

    const amountStr = payoutAmounts[selectedBeneficiary.id] || "";
    const amount = parseFloat(amountStr);

    setRowLoading(selectedBeneficiary.id, true);
    try {
      const response = await fetch('/api/dmt-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: selectedBeneficiary.accountHolderName,
          accountNumber: selectedBeneficiary.accountNumber,
          ifsc: selectedBeneficiary.ifscCode,
          remarks: "Payment imps",
          amount: amount,
          paymentMode:"IMPS",
          beneficiary: selectedBeneficiary,
          gateway: gateway,
          websiteUrl: websiteUrl,
          transactionId: transactionId,
        }),
      });

      const result = await response.json();
      console.log("DMT Payout response:", result);

      if (response.ok && result.data ) {
        setSuccessfulTransactionData({
          ...result,
          amount: amount,
          beneficiary: selectedBeneficiary,
          transactionType: 'DMT',
          timestamp: new Date().toISOString(),
        });
        setIsSuccessModalOpen(true);
        fetchDmtBeneficiaries(false); // Refresh DMT beneficiaries
        setPayoutAmounts(prev => ({ ...prev, [selectedBeneficiary.id]: "" }));
      } else if (!response.ok || (result.original && result.original.msg === "Sorry Insufficient wallet Balance")) {
        console.log("Error result in handleDmtGatewaySelect:", result);
        if (result.original && result.original.msg === "Sorry Insufficient wallet Balance") {
          toast({
            title: "Error",
            description: "Insufficient wallet balance. Please add funds.",
            variant: "destructive",
          });
        } else {
          throw new Error(result.message || 'Failed to initiate DMT payout');
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate DMT payout.",
        variant: "destructive",
      });
    } finally {
      setRowLoading(selectedBeneficiary.id, false);
      setSelectedBeneficiary(null);
    }
  };

  const handleGatewaySelect = async (gatewayDetails: { gateway: 'sevapay_weshubh' | 'sevapay_kelta' | 'aeronpay', websiteUrl: string, transactionId: string }) => {
    setIsGatewayPopupOpen(false);
    if (!selectedBeneficiary) return;

    const { gateway, websiteUrl, transactionId } = gatewayDetails;

    if (!websiteUrl.endsWith(transactionId)) {
        toast({
            title: "Error",
            description: "Wrong transaction ID. Please check the website URL and transaction ID.",
            variant: "destructive",
        });
        return;
    }

    const amountStr = payoutAmounts[selectedBeneficiary.id] || "";
    const amount = parseFloat(amountStr);

    const AERONPAY_LIMIT = 500000;
    const IMPS_LIMIT = 200000;

    if (gateway === 'aeronpay' && amount > AERONPAY_LIMIT) {
      toast({
        title: "Error",
        description: `Aeronpay transaction limit is ₹${AERONPAY_LIMIT.toLocaleString()}.`,
        variant: "destructive"
      });
      return;
    } else if (gateway !== 'aeronpay' && amount > IMPS_LIMIT) {
      toast({
        title: "Error",
        description: `Bank transfer (IMPS/NEFT) limit is ₹${IMPS_LIMIT.toLocaleString()}.`,
        variant: "destructive"
      });
      return;
    }

    setRowLoading(selectedBeneficiary.id, true);
    try {
      let response;
      if (gateway === 'aeronpay') {
        response = await fetch('/api/payout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount,
            beneficiaryId: selectedBeneficiary.id,
            websiteUrl: websiteUrl,
            transactionId: transactionId,
          }),
        });
      } else if ('accountNumber' in selectedBeneficiary && !('transactionType' in selectedBeneficiary)) {
        response = await fetch('/api/dmt-payout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount,
            beneficiary: selectedBeneficiary,
            gateway: gateway,
            websiteUrl: websiteUrl,
            transactionId: transactionId,
          }),
        });
      } else { // Existing Sevapay bank transfers
        response = await fetch('/api/sevapay/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount,
            beneficiary: selectedBeneficiary,
            gateway: gateway,
            websiteUrl: websiteUrl,
            transactionId: transactionId,
          }),
        });
      }

      const result = await response.json();
      console.log("Sevapay response:", response);

      if (response.ok && result.data ) {
        setSuccessfulTransactionData({
          ...result,
          amount: amount,
          beneficiary: selectedBeneficiary,
          transactionType: 'IMPS',
          timestamp: new Date().toISOString(),
        });
        setIsSuccessModalOpen(true);
        fetchBankBeneficiaries(false);
        setPayoutAmounts(prev => ({ ...prev, [selectedBeneficiary.id]: "" }));
      } else if (!response.ok || (result.msg && result.msg === "Sorry Insufficient wallet Balance")) {
        console.log("Error result in handleGatewaySelect:", result);
        if (result.msg && result.msg === "Sorry Insufficient wallet Balance") {
          toast({
            title: "Error",
            description: "Insufficient wallet balance. Please add funds.",
            variant: "destructive",
          });
        } else {
          throw new Error(result.message || 'Failed to initiate payout');
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate payout.",
        variant: "destructive",
      });
    } finally {
      setRowLoading(selectedBeneficiary.id, false);
      setSelectedBeneficiary(null);
    }
  };

  const handleViewReceipt = () => {
    if (!successfulTransactionData) return;

    const receiptData = {
      beneficiaryName: successfulTransactionData.beneficiary.accountHolderName,
      bankName: "STATE BANK OF INDIA -SBI", // Example data
      ifscCode: successfulTransactionData.beneficiary.ifscCode,
      accountNo: successfulTransactionData.beneficiary.accountNumber,
      transferType: successfulTransactionData.transactionType,
      serviceType: "Mini Payout",
      transactionTime: new Date(successfulTransactionData.timestamp).toLocaleTimeString(),
      transactionDate: new Date(successfulTransactionData.timestamp).toLocaleDateString(),
      transactionId: successfulTransactionData.transaction_no,
      rrnNo: successfulTransactionData.data?.transaction_no, // UTR/RRN might be here
      orderId: successfulTransactionData.data?.unique_id, // Reference No might be here
      payoutPurpose: "",
      amountRemitted: successfulTransactionData.amount,
      transactionStatus: successfulTransactionData.data?.status,
    };
    generateReceiptPDF(receiptData);
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

  const handleUpiAeronPaySelect = async (websiteUrl: string, utr: string) => {
    if (!selectedBeneficiary) return;

    const amountStr = payoutAmounts[selectedBeneficiary.id] || "";
    const amount = parseFloat(amountStr);

    setRowLoading(selectedBeneficiary.id, true);
    try {
      const response = await fetch('/api/aeronpay/upi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          beneficiary: selectedBeneficiary,
          websiteUrl: websiteUrl,
          utr: utr,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessfulTransactionData({
          ...result,
          amount: amount,
          beneficiary: selectedBeneficiary,
          transactionType: 'UPI',
          timestamp: new Date().toISOString(),
        });
        setIsSuccessModalOpen(true);
        fetchUpiBeneficiaries(false);
        // setPayoutAmounts(prev => ({ ...prev, [beneficiary.id]: "" }));
        setPayoutAmounts(prev => ({ ...prev, [selectedBeneficiary.id]: "" }));
      } else {
        throw new Error(result.message || 'Failed to initiate AeronPay UPI payment');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRowLoading(selectedBeneficiary.id, false);
      setSelectedBeneficiary(null);
    }
  };

  const initiateUpiPayment = async (beneficiary: UpiBeneficiary, amount: number, websiteUrl: string, utr: string) => {
    setRowLoading(beneficiary.id, true);
    try {
      const response = await fetch('/api/upi/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vpa: beneficiary.upiId,
          amount: amount,
          name: beneficiary.accountHolderName,
          websiteUrl: websiteUrl,
          utr: utr,
        }),
      });

      const result = await response.json();

      if (response.ok && result.data && (result.data.status === 'SUCCESS' || result.data.status === 'PENDING')) {
        setSuccessfulTransactionData({
          ...result,
          amount: amount,
          beneficiary: beneficiary,
          transactionType: 'UPI',
          timestamp: new Date().toISOString(),
        });
        setIsSuccessModalOpen(true);
        fetchUpiBeneficiaries(false); // Refresh UPI beneficiaries
        setPayoutAmounts(prev => ({ ...prev, [beneficiary.id]: "" }));
      } else if (!response.ok || (result.original && result.original.msg === "Sorry Insufficient wallet Balance")) {
        console.log("Error result in initiateUpiPayment:", result);
        if (result.original && result.original.msg === "Sorry Insufficient wallet Balance") {
          toast({
            title: "Error",
            description: "Insufficient wallet balance. Please add funds.",
            variant: "destructive",
          });
        } else {
          throw new Error(result.message || result.msg || 'Failed to initiate UPI payout');
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate UPI payout.",
        variant: "destructive",
      });
    } finally {
      setRowLoading(beneficiary.id, false);
      setSelectedBeneficiary(null);
    }
  };

  const RechargeForm = () => {
    const [mobileNumber, setMobileNumber] = useState('');
    const [operator, setOperator] = useState('');
    const [circle, setCircle] = useState('');
    const [loading, setLoading] = useState(false);
    const [operatorFetched, setOperatorFetched] = useState(false);

    const handleFetchOperator = async (e) => {
      e.preventDefault();
      setLoading(true);
      setOperatorFetched(false);
      try {
        const response = await fetch('/api/aeronpay/mobile-operator-fetch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mobile: mobileNumber }),
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
          setOperator(result.operator_name);
          setCircle(result.operator_circle);
          setOperatorFetched(true);
          toast({
            title: "Operator Fetched",
            description: `Operator: ${result.operator_name}, Circle: ${result.operator_circle}`,
          });
        } else {
          throw new Error(result.message || 'Failed to fetch operator');
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    return (
      <motion.div
        key="recharge-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto bg-card p-6 sm:p-8 rounded-xl border border-border/40 shadow-sm"
      >
        <h3 className="text-lg font-semibold mb-6 text-foreground">Mobile Recharge</h3>
        <form onSubmit={handleFetchOperator} className="space-y-5">
          <div>
            <label htmlFor="mobileNumber" className="block text-sm font-medium text-muted-foreground mb-1">
              Mobile Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                id="mobileNumber"
                name="mobileNumber"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                required
                autoComplete="off"
                className="pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Enter 10-digit mobile number"
              />
            </div>
          </div>

          {operatorFetched && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Operator
                </label>
                <p className="text-lg font-semibold">{operator}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Circle
                </label>
                <p className="text-lg font-semibold">{circle}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Fetching...
                </>
              ) : (
                'Fetch Operator'
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    );
  };

  return (
    <DashboardLayout>
      <UpiPaymentConfirmationPopup
        open={isUpiConfirmationPopupOpen}
        onClose={() => setIsUpiConfirmationPopupOpen(false)}
        onSelectAeronPay={(websiteUrl, utr) => {
          if (!websiteUrl.endsWith(utr)) {
            toast({
                title: "Error",
                description: "Wrong UTR. Please check the website URL and UTR.",
                variant: "destructive",
            });
            return;
          }
          setIsUpiConfirmationPopupOpen(false);
          handleUpiAeronPaySelect(websiteUrl, utr);
        }}
        onSelectP2I={(websiteUrl, utr) => {
          if (!websiteUrl.endsWith(utr)) {
            toast({
                title: "Error",
                description: "Wrong UTR. Please check the website URL and UTR.",
                variant: "destructive",
            });
            return;
          }
          setIsUpiConfirmationPopupOpen(false);
          if (selectedBeneficiary) {
            const amountStr = payoutAmounts[selectedBeneficiary.id] || "";
            const amount = parseFloat(amountStr);
            initiateUpiPayment(selectedBeneficiary as UpiBeneficiary, amount, websiteUrl, utr);
          }
        }}
        beneficiary={selectedBeneficiary}
        amount={payoutAmounts[selectedBeneficiary?.id]}
      />
      <PaymentGatewayPopup
        open={isGatewayPopupOpen}
        onClose={() => setIsGatewayPopupOpen(false)}
        onSelect={handleGatewaySelect}
        beneficiary={selectedBeneficiary}
        amount={payoutAmounts[selectedBeneficiary?.id]}
      />
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="dark:text-black">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this beneficiary?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the beneficiary.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={formLoading}>
              {formLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TransactionSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setIsSuccessModalOpen(false);
          setSuccessfulTransactionData(null);
        }}
        onViewReceipt={handleViewReceipt}
        transactionDetails={{
          amount: successfulTransactionData?.amount || 0,
          beneficiaryName: successfulTransactionData?.beneficiary?.accountHolderName || 'N/A',
          accountNumber: successfulTransactionData?.beneficiary?.accountNumber || successfulTransactionData?.beneficiary?.upiId || 'N/A',
          transactionId: successfulTransactionData?.transaction_no || successfulTransactionData?.data?.transaction_no || 'N/A',
          transactionType: successfulTransactionData?.transactionType || 'N/A',
          timestamp: successfulTransactionData?.timestamp 
            ? new Date(successfulTransactionData.timestamp).toISOString() 
            : new Date().toISOString(),
        }}
      />

      <BankTransferBeneficiaryModal
        isOpen={isBankTransferBeneficiaryModalOpen}
        onClose={() => setIsBankTransferBeneficiaryModalOpen(false)}
        onSuccess={() => {
          setIsBankTransferBeneficiaryModalOpen(false);
          fetchDmtBeneficiaries(false); // Refresh DMT beneficiaries
          toast({
            title: "Success",
            description: "Bank transfer beneficiary added successfully.",
          });
        }}
      />

      <DmtPaymentConfirmationPopup
        open={isDmtConfirmationPopupOpen}
        onClose={() => setIsDmtConfirmationPopupOpen(false)}
        onConfirm={handleDmtGatewaySelect}
        beneficiary={selectedBeneficiary as DmtBeneficiary | null}
        amount={payoutAmounts[selectedBeneficiary?.id]}
      />
      <div className="space-y-6 mt-5">
        <div className="flex items-center justify-between">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="text-center w-full">
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
              className="grid mx-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5"
            >
              {services.map((service, index) => (
                <motion.button
                  key={service.id}
                  onClick={() => handleServiceSelect(service.id)}
                  className={`
                    bg-card rounded-xl p-4 md:p-5 text-left shadow-sm
                    border-2 border-blue-300 dark:border-blue-700 
                    hover:border-blue-400 dark:hover:border-blue-600 
                    transition-all duration-200 group  bg-gray-100 dark:bg-gray-800
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
                                  onClick={() => handlePay(row)} 
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
                            { 
                              key: "delete", 
                              header: "", 
                              className: "min-w-[50px]", 
                              render: (row: BankBeneficiary) => (
                                <button 
                                  onClick={() => handleDeleteClick(row)} 
                                  disabled={actionLoading[row.id]} 
                                  className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Trash2 className="h-3 w-3" />
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
                                autoComplete="off"
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
                                autoComplete="off"
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
                                autoComplete="off"
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
                                autoComplete="off"
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
                                    disabled={actionLoading[row.id]} 
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
                                  onClick={() => handlePay(row)} 
                                  disabled={!(parseFloat(payoutAmounts[row.id] || "0") > 0) || actionLoading[row.id]} 
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
                            { 
                              key: "delete", 
                              header: "", 
                              className: "min-w-[50px]", 
                              render: (row: UpiBeneficiary) => (
                                <button 
                                  onClick={() => handleDeleteClick(row)} 
                                  disabled={actionLoading[row.id]} 
                                  className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Trash2 className="h-3 w-3" />
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
                              autoComplete="off"
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
                                autoComplete="off"
                                className="pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" 
                                placeholder="Name for your reference" 
                              />
                            </div>
                          </div>
                          <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={handleCheckName} 
                            disabled={formLoading || !newUpiBeneficiaryData.upiId}
                          >
                            {formLoading && isNameCheckLoading ? (
                              <Loader2 className="animate-spin h-4 w-4 mr-2"/>
                            ) : null}
                            Check Name
                          </Button>
                          <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={handleVerify} 
                            disabled={formLoading || !newUpiBeneficiaryData.upiId || isUpiVerifiedSim === true}
                          >
                            {isUpiVerifiedSim === true ? (
                              <CheckCircle className="h-4 w-4 text-green-500"/>
                            ) : null}
                            {isUpiVerifiedSim === true ? 'Verified' : 'Verify'}
                          </Button>
                        </div>

                        {isUpiVerifiedSim === true && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            UPI ID Verified. Name: {newUpiBeneficiaryData.accountHolderName}
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

              {selectedService === "Recharge" && <RechargeForm />}
              {selectedService === "DMT" && (
                <motion.div key="dmt-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <div className="mb-4 p-4 bg-card border border-border/40 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Domestic Money Transfer</h2>
                      <p className="text-sm text-muted-foreground">Send money to any bank account instantly.</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={() => setIsBankTransferBeneficiaryModalOpen(true)}>
                        Add Bank Transfer Beneficiary
                      </Button>
                    </div>
                  </div>

                  <motion.div 
                    key="view-dmt-beneficiaries" 
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
                    ) : dmtBeneficiaries.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        No DMT beneficiaries found. Add one to get started.
                      </div>
                    ) : (
                      <DataTable 
                        data={filteredDmtBeneficiaries} 
                        columns={[
                          { 
                            key: "accountHolderName", 
                            header: "Beneficiary Name", 
                            className: "min-w-[150px]" 
                          },
                          { 
                            key: "accountNumber", 
                            header: "Account Number", 
                            render: (row: DmtBeneficiary) => `${row.accountNumber}`,
                            className: "min-w-[120px]" 
                          },
                          { 
                            key: "ifscCode", 
                            header: "IFSC Code", 
                            render: (row: DmtBeneficiary) => `${row.ifscCode}`,
                            className: "min-w-[100px]" 
                          },
                          { 
                            key: "isVerified", 
                            header: "Status", 
                            className: "min-w-[100px]",
                            render: (row: DmtBeneficiary) => row.isVerified ? (
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
                            render: (row: DmtBeneficiary) => (
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
                            render: (row: DmtBeneficiary) => (
                              <button 
                                onClick={() => handlePay(row as BankBeneficiary | UpiBeneficiary | DmtBeneficiary)} 
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
                          { 
                            key: "delete", 
                            header: "", 
                            className: "min-w-[50px]", 
                            render: (row: DmtBeneficiary) => (
                              <button 
                                onClick={() => handleDeleteClick(row as BankBeneficiary | UpiBeneficiary | DmtBeneficiary)} 
                                disabled={actionLoading[row.id]} 
                                className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )
                          },
                        ]} 
                      />
                    )}
                  </motion.div>
                </motion.div>
              )}
              {selectedService === "CreditCardPayment" && (
                <motion.div
                  key="credit-card-payment-content"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="max-w-2xl mx-auto bg-card p-6 sm:p-8 rounded-xl border border-border/40 shadow-sm"
                >
                  <h3 className="text-lg font-semibold mb-6 text-foreground">Credit Card Bill Payment</h3>
                  <CreditCardPaymentForm
                    onSuccess={() => {
                      toast({ title: "Success", description: "Credit card payment successful." });
                      setSelectedService(null);
                    }}
                    onCancel={() => setSelectedService(null)}
                  />
                </motion.div>
              )}
              {selectedService === "BillPayments" && renderPlaceholder("Utility Bill Payments")}
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
                        }
                      ]} 
                    />
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default ServicesPage;
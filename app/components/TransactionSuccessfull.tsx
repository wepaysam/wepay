import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, X } from "lucide-react";
import Image from "next/image";
import watermark from "../../Assets/watermark.jpg"; // Adjust path as needed

// This interface defines what this modal component *expects* to receive
// It should match the structure of the `transactionDetails` state in ServicesPage
interface TransactionDetailsFromParent {
  amount: number;
  beneficiaryName: string;
  accountNumber: string; // This field will hold account no. OR UPI ID
  transactionId: string;
  transactionType: 'NEFT' | 'IMPS' | 'UPI' | string; // Be flexible for future types
  timestamp: string;
}

interface TransactionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewReceipt: () => void;
  transactionDetails: TransactionDetailsFromParent; // Use the defined interface
}

const TransactionSuccessModal: React.FC<TransactionSuccessModalProps> = ({
  isOpen,
  onClose,
  onViewReceipt,
  // The default value here is a fallback if the prop is made optional,
  // but since it's required, the parent (ServicesPage) must always pass a valid object.
  transactionDetails = { 
    amount: 0,
    beneficiaryName: "N/A",
    accountNumber: "N/A",
    transactionId: "N/A",
    transactionType: "UNKNOWN",
    timestamp: new Date().toISOString()
  }
}) => {
  if (!isOpen) return null;

  const formattedDate = new Date(transactionDetails.timestamp).toLocaleDateString();
  const formattedTime = new Date(transactionDetails.timestamp).toLocaleTimeString();

  // Determine the label for the account/UPI ID based on transactionType
  const getIdentifierLabel = () => {
    const type = transactionDetails.transactionType?.toUpperCase();
    if (type === 'UPI') {
      return "UPI ID";
    }
    // Add more conditions if other services use the 'accountNumber' field for different things
    // e.g., if (type === 'RECHARGE') return "Mobile Number";
    return "Account No."; // Default for IMPS, NEFT, etc.
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="relative max-w-md w-full bg-card rounded-xl shadow-lg p-6 border border-border/40"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center justify-center mb-6">
          <div className="bg-green-500/10 dark:bg-green-500/20 p-3 rounded-full mb-3">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-green-600 dark:text-green-400">Transaction Successful!</h3>
          <p className="text-muted-foreground text-sm mt-1 text-center">Your payment has been processed successfully.</p>
        </div>

        {/* Watermark Image */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
          <Image src={watermark} alt="Watermark" width={500} height={500} className="w-3/4 h-auto object-contain" />
        </div>

        <div className="space-y-3 bg-secondary/50 dark:bg-secondary/20 rounded-lg p-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Amount</span>
            <span className="font-medium text-foreground text-sm">₹{Number(transactionDetails.amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">To</span>
            <span className="font-medium text-foreground text-sm">{transactionDetails.beneficiaryName}</span>
          </div>
          {/* UPDATED SECTION FOR DYNAMIC IDENTIFIER LABEL */}
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">{getIdentifierLabel()}</span>
            <span className="font-medium text-foreground text-sm">{transactionDetails.accountNumber}</span> {/* Value comes from accountNumber */}
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Transaction ID</span>
            <span className="font-medium text-foreground text-sm">{transactionDetails.transactionId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Type</span>
            <span className="font-medium text-foreground text-sm">{transactionDetails.transactionType.replace(/([A-Z])/g, ' $1').trim()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Date & Time</span>
            <span className="font-medium text-foreground text-sm">{formattedDate}, {formattedTime}</span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg text-foreground bg-card hover:bg-muted/50 dark:hover:bg-secondary/40 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onViewReceipt}
            className="flex-1 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            View Receipt
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default TransactionSuccessModal;
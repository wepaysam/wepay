import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, X } from "lucide-react";

const TransactionSuccessModal = ({ 
  isOpen, 
  onClose, 
  transactionDetails = {
    amount: 0,
    beneficiaryName: "",
    accountNumber: "",
    transactionId: "",
    transactionType: "NEFT",
    timestamp: new Date().toISOString()
  } 
}) => {
  if (!isOpen) return null;

  // Format the timestamp
  const formattedDate = new Date(transactionDetails.timestamp).toLocaleDateString();
  const formattedTime = new Date(transactionDetails.timestamp).toLocaleTimeString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="relative max-w-md w-full bg-card rounded-xl shadow-lg p-6 border border-border/40"
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Success Icon */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="bg-green-100 p-3 rounded-full mb-3">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-green-600">Transaction Successful!</h3>
          <p className="text-muted-foreground text-sm mt-1">Your payment has been processed successfully</p>
        </div>

        {/* Transaction Details */}
        <div className="space-y-3 bg-secondary/30 rounded-lg p-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium">₹{Number(transactionDetails.amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">To</span>
            <span className="font-medium">{transactionDetails.beneficiaryName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account No.</span>
            <span className="font-medium">{transactionDetails.accountNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Transaction ID</span>
            <span className="font-medium">{transactionDetails.transactionId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium">{transactionDetails.transactionType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date & Time</span>
            <span className="font-medium">{formattedDate}, {formattedTime}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary/50"
          >
            Close
          </button>
          <button
            className="flex-1 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            View Receipt
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default TransactionSuccessModal;
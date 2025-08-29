"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Banknote, Send } from "lucide-react";
import { Input } from "../components/ui/input";
import MainLayout from "../components/MainLayout";
import { Button } from "../components/ui/button";
import { useRouter } from "next/navigation";
import { generateReceiptPDF } from "../utils/pdfGenerator";

import TransactionSuccessModal from "../components/TransactionSuccessfull";

const UpiPayoutPage = () => {
  const [vpa, setVpa] = useState("");
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successfulTransactionData, setSuccessfulTransactionData] = useState<any>(null);
  const router = useRouter();

  const handleViewReceipt = () => {
    if (!successfulTransactionData) return;

    const receiptData = {
      beneficiaryName: successfulTransactionData.beneficiary.accountHolderName,
      bankName: "", // Not available for UPI
      ifscCode: "", // Not available for UPI
      accountNo: successfulTransactionData.beneficiary.upiId,
      transferType: successfulTransactionData.transactionType,
      serviceType: "UPI Payout",
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

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/upi/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vpa, amount: parseFloat(amount), name }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessfulTransactionData({
          ...result,
          amount: parseFloat(amount),
          beneficiary: { accountHolderName: name, upiId: vpa },
          transactionType: 'UPI',
          timestamp: new Date().toISOString(),
        });
        setIsSuccessModalOpen(true);
        setVpa('');
        setAmount('');
        setName('');
      } else {
        setMessage({ type: 'error', text: result.message || result.error || 'UPI Payout failed.' });
      }
    } catch (error: any) {
      console.error("Error during UPI payout:", error);
      setMessage({ type: 'error', text: error.message || 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout location="/upi-payout">
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
          accountNumber: successfulTransactionData?.beneficiary?.upiId || 'N/A',
          transactionId: successfulTransactionData?.transaction_no || successfulTransactionData?.data?.transaction_no || 'N/A',
          transactionType: successfulTransactionData?.transactionType || 'N/A',
          timestamp: successfulTransactionData?.timestamp 
            ? new Date(successfulTransactionData.timestamp).toISOString() 
            : new Date().toISOString(),
        }}
      />
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-card text-foreground rounded-2xl shadow-lg border border-border p-6 sm:p-8"
        >
          <div className="text-center mb-8">
            <Banknote className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold">UPI Payout</h1>
            <p className="text-sm text-muted-foreground">Send money instantly via UPI.</p>
          </div>

          <form onSubmit={handlePayout} className="space-y-6">
            <div>
              <label htmlFor="vpa" className="block text-sm font-medium text-muted-foreground mb-1">UPI VPA</label>
              <Input
                id="vpa"
                type="text"
                placeholder="e.g., example@bankname"
                value={vpa}
                onChange={(e) => setVpa(e.target.value)}
                required
                className="dark:text-black"
              />
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-muted-foreground mb-1">Amount</label>
              <Input
                id="amount"
                type="number"
                placeholder="e.g., 100.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0.01"
                step="0.01"
                className="dark:text-black"
              />
            </div>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">Beneficiary Name</label>
              <Input
                id="name"
                type="text"
                placeholder="e.g., John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="dark:text-black"
              />
            </div>

            {message && (
              <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {message.text}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                'Processing...'
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Send Payout</>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default UpiPayoutPage;

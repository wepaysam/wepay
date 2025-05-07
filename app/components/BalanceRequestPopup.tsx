"use client";
import React, { useState } from "react";
import { X } from "lucide-react";
import { useToast } from "../hooks/use-toast";

interface BalanceRequestPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const BalanceRequestPopup: React.FC<BalanceRequestPopupProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !utrNumber) {
      toast({
        title: "Missing Information",
        description: "Please fill all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get token from document.cookie
      const token = typeof document !== 'undefined' 
        ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1")
        : null;
      
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to request balance",
          variant: "destructive",
        });
        return;
      }
      
      setIsSubmitting(true);
      
      console.log("Token available:", !!token);
      
      const response = await fetch("/api/balance-request", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          UTRnumber: utrNumber
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit balance request");
      }

      toast({
        title: "Success",
        description: "Balance request submitted successfully",
      });
      
      // Reset form
      setAmount("");
      setUtrNumber("");
      
      // Close popup and trigger success callback if provided
      onClose();
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error("Balance request error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit balance request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium">Request Balance Top-up</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium mb-1">
              Amount (₹)
            </label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              required
            />
          </div>
          
          <div>
            <label htmlFor="utrNumber" className="block text-sm font-medium mb-1">
              UTR Number
            </label>
            <input
              id="utrNumber"
              type="text"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder="Enter UTR number"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              required
            />
          </div>
          
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium mr-2 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BalanceRequestPopup;

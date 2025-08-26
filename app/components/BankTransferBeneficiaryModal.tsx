
"use client";
import React from "react";
import { X } from "lucide-react";
import BankTransferBeneficiaryForm from "./BankTransferBeneficiaryForm";

interface BankTransferBeneficiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BankTransferBeneficiaryModal: React.FC<BankTransferBeneficiaryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium">Add Bank Transfer Beneficiary</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          <BankTransferBeneficiaryForm onSuccess={onSuccess} onCancel={onClose} />
        </div>
      </div>
    </div>
  );
};

export default BankTransferBeneficiaryModal;

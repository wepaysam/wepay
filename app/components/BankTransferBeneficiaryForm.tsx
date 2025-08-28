
"use client";
import React, { useState, useEffect } from "react";
import { Hash, User, Building, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "../hooks/use-toast";

interface BankInfo {
  id: string;
  name: string;
  ifsc: string;
  location: string | null;
}

interface BankTransferBeneficiaryFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const BankTransferBeneficiaryForm: React.FC<BankTransferBeneficiaryFormProps> = ({ onSuccess, onCancel }) => {
  const { toast } = useToast();
  const [formLoading, setFormLoading] = useState(false);
  const [banks, setBanks] = useState<BankInfo[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [ifscCode, setIfscCode] = useState<string>("");
  const [newBankBeneficiaryData, setNewBankBeneficiaryData] = useState({
    accountNumber: "",
    confirmAccountNumber: "",
    accountHolderName: "",
    transactionType: "IMPS" as "NEFT" | "IMPS", // Assuming IMPS for bank transfer
  });

  useEffect(() => {
    const fetchBanks = async () => {
      console.log("Attempting to fetch banks...");
      try {
        const response = await fetch('/api/bank-info');
        console.log("Bank API response status:", response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Bank API response error text:", errorText);
          throw new Error(`Failed to fetch bank information: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log("Fetched bank data:", data);
        setBanks(data.banks);
      } catch (error: any) {
        console.error("Error during bank fetch:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load bank list.",
          variant: "destructive"
        });
      }
    };
    fetchBanks();
  }, [toast]);

  const handleBankInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewBankBeneficiaryData(prev => ({ ...prev, [name]: value }));
  };

  const handleBankSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bankId = e.target.value;
    setSelectedBankId(bankId);
    const selectedBank = banks.find(bank => bank.id === bankId);
    if (selectedBank) {
      setIfscCode(selectedBank.ifsc);
    } else {
      setIfscCode("");
    }
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

    const selectedBank = banks.find(bank => bank.id === selectedBankId);
    if (!selectedBank) {
      toast({
        title: "Error",
        description: "Please select a bank.",
        variant: "destructive"
      });
      setFormLoading(false);
      return;
    }

    try {
      // In a real application, you would get the userId from your authentication context
      const dummyUserId = "clx022222000008jwe222222"; // Replace with actual user ID

      const response = await fetch('/api/dmt-beneficiaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountNumber: newBankBeneficiaryData.accountNumber,
          accountHolderName: newBankBeneficiaryData.accountHolderName,
          ifscCode: selectedBank.ifsc, // Use IFSC from selected bank
          userId: dummyUserId,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add beneficiary');
      }
      toast({
        title: "Success",
        description: "Bank transfer beneficiary added successfully.",
      });
      setNewBankBeneficiaryData({
        accountNumber: "",
        confirmAccountNumber: "",
        accountHolderName: "",
        transactionType: "IMPS"
      });
      setSelectedBankId(""); // Reset selected bank
      onSuccess(); // Call onSuccess to close modal or refresh list
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

  return (
    <div className="max-w-2xl mx-auto bg-card p-6 sm:p-8 rounded-xl border border-border/40 shadow-sm">
      <h3 className="text-lg font-semibold mb-6 text-foreground">Add New Bank Transfer Beneficiary</h3>
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
            <label htmlFor="bankSelect" className="block text-sm font-medium text-muted-foreground mb-1">
              Select Bank <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <select
                id="bankSelect"
                name="bankSelect"
                value={selectedBankId}
                onChange={handleBankSelectChange}
                required
                className="pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
              >
                <option value="">Select a bank</option>
                {banks.map(bank => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name} {bank.location ? `(${bank.location})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="ifscCode" className="block text-sm font-medium text-muted-foreground mb-1">
              IFSC Code
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                id="ifscCode"
                name="ifscCode"
                value={ifscCode}
                readOnly
                className="pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:outline-none dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
                placeholder="IFSC Code"
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
            onClick={onCancel}
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
    </div>
  );
};

export default BankTransferBeneficiaryForm;

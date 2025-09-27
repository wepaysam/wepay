import React, { useState, useEffect } from 'react';

interface DmtBeneficiary {
  id: string;
  accountNumber: string;
  accountHolderName: string;
  ifscCode?: string;
  isVerified: boolean;
  createdAt: string;
  userId: string;
}

interface DmtPaymentConfirmationPopupProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (gatewayDetails: { gateway: 'sevapay_weshubh' | 'sevapay_kelta', websiteUrl: string }) => void;
    beneficiary: DmtBeneficiary | null;
    amount: string;
    lastTransaction: any;
}

const DmtPaymentConfirmationPopup: React.FC<DmtPaymentConfirmationPopupProps> = ({ open, onClose, onConfirm, beneficiary, amount, lastTransaction }) => {
    const [websiteUrl, setWebsiteUrl] = useState('');

    useEffect(() => {
        if (open) {
            setWebsiteUrl('');
        }
    }, [open]);

    if (!open) return null;

    const handleConfirm = (gateway: 'sevapay_weshubh' | 'sevapay_kelta') => {
        if (!websiteUrl) {
            alert('Website URL is required.');
            return;
        }
        onConfirm({ gateway, websiteUrl });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg dark:bg-gray-800">
                <h2 className="text-2xl dark:text-white font-bold mb-4">Confirm DMT Payment</h2>
                {beneficiary && (
                    <div className="mb-4 text-left">
                        <p className="text-gray-700 dark:text-gray-300"><strong>Beneficiary:</strong> {beneficiary.accountHolderName}</p>
                        <p className="text-gray-700 dark:text-gray-300"><strong>Account Number:</strong> {beneficiary.accountNumber}</p>
                        <p className="text-gray-700 dark:text-gray-300"><strong>IFSC Code:</strong> {beneficiary.ifscCode}</p>
                        <p className="text-gray-700 dark:text-gray-300"><strong>Amount:</strong> ₹{amount}</p>
                    </div>
                )}

                {lastTransaction && (
                    <div className="mb-4 text-left text-sm text-gray-600 dark:text-gray-400 border-t pt-4 mt-4">
                        <p><strong>Last Transaction:</strong></p>
                        <p>Amount: ₹{lastTransaction.amount}</p>
                        <p>Date: {new Date(lastTransaction.createdAt).toLocaleString()}</p>
                        <p>Status: {lastTransaction.transactionStatus}</p>
                    </div>
                )}
                <div className="mb-4">
                    <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Transaction ID</label>
                    <input
                        type="text"
                        id="websiteUrl"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        maxLength={11}
                        required
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    />
                </div>
                
                <div className="flex justify-center">
                    <button onClick={() => handleConfirm('sevapay_weshubh')} className="bg-green-500 text-white px-4 py-2 rounded-lg">Pay</button>
                </div>
                <button onClick={onClose} className="mt-4 text-red-500">Close</button>
            </div>
        </div>
    );
};

export default DmtPaymentConfirmationPopup;


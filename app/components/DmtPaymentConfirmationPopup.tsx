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
    onConfirm: (gatewayDetails: { gateway: 'sevapay_weshubh' | 'sevapay_kelta', websiteUrl: string, transactionId: string }) => void;
    beneficiary: DmtBeneficiary | null;
    amount: string;
}

const DmtPaymentConfirmationPopup: React.FC<DmtPaymentConfirmationPopupProps> = ({ open, onClose, onConfirm, beneficiary, amount }) => {
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [transactionId, setTransactionId] = useState('');

    useEffect(() => {
        if (open) {
            setWebsiteUrl('');
            setTransactionId('');
        }
    }, [open]);

    if (!open) return null;

    const handleConfirm = (gateway: 'sevapay_weshubh' | 'sevapay_kelta') => {
        if (!websiteUrl || !transactionId) {
            alert('Website URL and Transaction ID are required.');
            return;
        }
        onConfirm({ gateway, websiteUrl, transactionId });
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
                <div className="mb-4">
                    <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Website URL</label>
                    <input
                        type="text"
                        id="websiteUrl"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        required
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="transactionId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Transaction ID</label>
                    <input
                        type="text"
                        id="transactionId"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        required
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    />
                </div>
                <div className="flex justify-around">
                    <button onClick={() => handleConfirm('sevapay_weshubh')} className="bg-green-500 text-white px-4 py-2 rounded-lg mr-4">Aeronpay</button>
                    <button onClick={() => handleConfirm('sevapay_kelta')} className="bg-blue-500 text-white px-4 py-2 rounded-lg">Kelta</button>
                </div>
                <button onClick={onClose} className="mt-4 text-red-500">Close</button>
            </div>
        </div>
    );
};

export default DmtPaymentConfirmationPopup;

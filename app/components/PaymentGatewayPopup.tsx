
import React from 'react';

const PaymentGatewayPopup = ({ open, onClose, onSelect }) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg">
                <h2 className="text-2xl dark:text-black font-bold mb-4">Select Payment Gateway</h2>
                <div className="flex justify-around">
                    {/* <button onClick={() => onSelect('aeronpay')} className="bg-blue-500 text-white px-4 py-2 rounded-lg">Aeronpay</button> */}
                    <button onClick={() => onSelect('sevapay_weshubh')} className="bg-green-500 text-white px-4 py-2 rounded-lg mr-4">Sevapay Weshubh</button>
                    <button onClick={() => onSelect('sevapay_kelta')} className="bg-blue-500 text-white px-4 py-2 rounded-lg">Sevapay Kelta</button>
                </div>
                <button onClick={onClose} className="mt-4 text-red-500">Close</button>
            </div>
        </div>
    );
};

export default PaymentGatewayPopup;

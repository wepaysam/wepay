import React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from './ui/alert-dialog';
import { Button } from './ui/button';

interface UpiPaymentConfirmationPopupProps {
  open: boolean;
  onClose: () => void;
  onSelectAeronPay: () => void;
  onSelectP2I: () => void;
  beneficiary: any;
  amount: string;
}

const UpiPaymentConfirmationPopup: React.FC<UpiPaymentConfirmationPopupProps> = ({ open, onClose, onSelectAeronPay, onSelectP2I, beneficiary, amount }) => {
  if (!open || !beneficiary) return null;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="dark:text-black">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm UPI Payment</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to send <strong>₹{amount}</strong> to <strong>{beneficiary.accountHolderName}</strong> ({beneficiary.upiId}).
            <br />
            Please select a payment gateway.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex justify-between w-full">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <div className="flex gap-2">
            <Button onClick={onSelectAeronPay} className="bg-blue-500 hover:bg-blue-600 text-white">AeronPay</Button>
            <Button onClick={onSelectP2I} className="bg-green-500 hover:bg-green-600 text-white">P2I</Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UpiPaymentConfirmationPopup;

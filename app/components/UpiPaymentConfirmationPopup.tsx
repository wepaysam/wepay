import React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from './ui/alert-dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useGlobalContext } from '../context/GlobalContext';

interface UpiPaymentConfirmationPopupProps {
  open: boolean;
  onClose: () => void;
  onSelectAeronPay: (websiteUrl: string, utr: string) => void;
  onSelectP2I: (websiteUrl: string, utr: string) => void;
  beneficiary: any;
  amount: string;
}

const UpiPaymentConfirmationPopup: React.FC<UpiPaymentConfirmationPopupProps> = ({ open, onClose, onSelectAeronPay, onSelectP2I, beneficiary, amount }) => {
  const [websiteUrl, setWebsiteUrl] = React.useState("");
  const [utr, setUtr] = React.useState("");
  const { user } = useGlobalContext();

  React.useEffect(() => {
    if (open) {
      setWebsiteUrl("");
      setUtr("");
    }
  }, [open]);

  if (!open || !beneficiary) return null;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="dark:text-black">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm UPI Payment</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to send <strong>₹{amount}</strong> to <strong>{beneficiary.accountHolderName}</strong> ({beneficiary.upiId}).
            <br />
            Please enter the website URL and UTR.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
            <div>
                <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Website URL</label>
                <Input id="websiteUrl" type="text" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className="mt-1 block w-full" />
            </div>
            <div>
                <label htmlFor="utr" className="block text-sm font-medium text-gray-700 dark:text-gray-300">UTR</label>
                <Input id="utr" type="text" value={utr} onChange={(e) => setUtr(e.target.value)} className="mt-1 block w-full" />
            </div>
        </div>
        <AlertDialogFooter className="flex justify-between w-full">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <div className="flex gap-2">
            {user?.upiPermissions?.aeronpay && <Button onClick={() => onSelectAeronPay(websiteUrl, utr)} className="bg-blue-500 hover:bg-blue-600 text-white">AeronPay</Button>}
            {user?.upiPermissions?.p2i && <Button onClick={() => onSelectP2I(websiteUrl, utr)} className="bg-green-500 hover:bg-green-600 text-white">P2I</Button>}
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UpiPaymentConfirmationPopup;

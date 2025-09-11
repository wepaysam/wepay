
"use client";
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface CreditCardPaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const CreditCardPaymentForm: React.FC<CreditCardPaymentFormProps> = ({ onSuccess, onCancel }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [amount, setAmount] = useState('');
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  const handleVerify = async () => {
    if (!cardNumber) {
      toast({ title: 'Error', description: 'Please enter a card number.', variant: 'destructive' });
      return;
    }
    setVerifying(true);
    try {
      const response = await fetch('/api/aeronpay/verify-credit-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNumber }),
      });
      const result = await response.json();
      if (response.ok && result.status === 'success') {
        setCardHolderName(result.name);
        setIsVerified(true);
        toast({ title: 'Success', description: 'Credit card verified successfully.' });
      } else {
        setIsVerified(false);
        toast({ title: 'Error', description: result.message || 'Failed to verify credit card.', variant: 'destructive' });
      }
    } catch (error) {
      setIsVerified(false);
      toast({ title: 'Error', description: 'An error occurred during verification.', variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      toast({ title: 'Error', description: 'Please verify your credit card first.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/aeronpay/credit-card-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNumber, cardHolderName, amount: parseFloat(amount) }),
      });
      const result = await response.json();
      if (response.ok && result.status === 'success') {
        toast({ title: 'Success', description: 'Credit card payment successful.' });
        onSuccess();
      } else {
        toast({ title: 'Error', description: result.message || 'Failed to process payment.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An error occurred during payment.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="cardNumber" className="block text-sm font-medium text-muted-foreground mb-1">Credit Card Number</label>
        <div className="flex items-center gap-2">
          <Input
            id="cardNumber"
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder="Enter Credit Card Number"
            required
          />
          <Button type="button" onClick={handleVerify} disabled={verifying || !cardNumber}>
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
          </Button>
        </div>
      </div>
      {isVerified === true && (
        <p className="text-xs text-green-600 dark:text-green-400">Credit card verified. Name: {cardHolderName}</p>
      )}
      {isVerified === false && (
        <p className="text-xs text-red-600 dark:text-red-400">Credit card verification failed. Please check the number and try again.</p>
      )}
      <div>
        <label htmlFor="cardHolderName" className="block text-sm font-medium text-muted-foreground mb-1">Card Holder Name</label>
        <Input
          id="cardHolderName"
          type="text"
          value={cardHolderName}
          onChange={(e) => setCardHolderName(e.target.value)}
          placeholder="Card Holder Name"
          required
          disabled
        />
      </div>
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-muted-foreground mb-1">Amount</label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter Amount"
          required
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading || !isVerified}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pay Bill'}
        </Button>
      </div>
    </form>
  );
};

export default CreditCardPaymentForm;

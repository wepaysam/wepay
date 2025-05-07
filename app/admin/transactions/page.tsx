'use client';
import { useState, useEffect } from 'react';
import { useToast } from '../../hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { formatDate } from '../../lib/utils';

// Add proper type for transactions
interface Transaction {
  id: string;
  amount: number;
  transactionType: string;
  transactionStatus: string;
  createdAt: string;
  sender: {
    phoneNumber: string;
    email: string;
  };
  beneficiary?: {
    accountNumber: string;
    accountHolderName: string;
  };
}

export default function TransactionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  // Initialize as empty array
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      // Get token from cookies
      const token = typeof document !== 'undefined' 
      ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1")
      : null;
       if (!token) {
         toast({
           title: "Authentication Error",
           description: "You're not logged in. Please log in and try again.",
           variant: "destructive",
         });
         router.push('/Auth/login');
         return;
       }
      const response = await fetch('/api/admin/transactions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      console.log("Transactions:", data);
      // Ensure data is an array before setting
      setTransactions(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]); // Set empty array on error
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction: Transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.id}</TableCell>
                    <TableCell>{transaction.sender?.phoneNumber}</TableCell>
                    <TableCell>₹{transaction.amount}</TableCell>
                    <TableCell>{transaction.transactionType}</TableCell>
                    <TableCell>{transaction.transactionStatus}</TableCell>
                    <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 
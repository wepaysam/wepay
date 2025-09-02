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

import { Input } from '../../components/ui/input';

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

const getBeneficiaryName = (transaction) => {
  if (transaction.beneficiary) {
    return transaction.beneficiary.accountHolderName;
  }
  if (transaction.upiBeneficiary) {
    return transaction.upiBeneficiary.accountHolderName;
  }
  if (transaction.dmtBeneficiary) {
    return transaction.dmtBeneficiary.accountHolderName;
  }
  return 'N/A';
};

export default function TransactionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  // Initialize as empty array
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
      setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]); // Set empty array on error
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const query = searchQuery.toLowerCase();
    return (
      transaction.id.toLowerCase().includes(query) ||
      transaction.sender.phoneNumber.toLowerCase().includes(query) ||
      transaction.sender.email.toLowerCase().includes(query)
    );
  });

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <Input
            placeholder="Search by ID, phone, or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Beneficiary</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction: Transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.id}</TableCell>
                      <TableCell>{transaction.sender?.phoneNumber}</TableCell>
                      <TableCell>{getBeneficiaryName(transaction)}</TableCell>
                      <TableCell>₹{transaction.amount}</TableCell>
                      <TableCell>{transaction.transactionType}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            transaction.transactionStatus === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : transaction.transactionStatus === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                          {transaction.transactionStatus}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 
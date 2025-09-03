'use client';
import { useState, useEffect, useMemo } from 'react';
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
import StatCard from '../../components/StatCard';
import { DollarSign, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

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
  upiBeneficiary?: {
    upiId: string;
    accountHolderName: string;
  };
  dmtBeneficiary?: {
    accountNumber: string;
    accountHolderName: string;
  };
}

const getBeneficiaryName = (transaction: Transaction) => {
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('today');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
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
      setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (transaction) =>
          transaction.id.toLowerCase().includes(query) ||
          transaction.sender.phoneNumber.toLowerCase().includes(query) ||
          transaction.sender.email.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(
        (transaction) => transaction.transactionType === typeFilter
      );
    }

    if (timeFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const thisWeekStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - now.getDay()
      );
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      filtered = filtered.filter((transaction) => {
        const transactionDate = new Date(transaction.createdAt);
        switch (timeFilter) {
          case 'today':
            return transactionDate >= today;
          case 'yesterday':
            return transactionDate >= yesterday && transactionDate < today;
          case 'thisWeek':
            return transactionDate >= thisWeekStart;
          case 'thisMonth':
            return transactionDate >= thisMonthStart;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [transactions, searchQuery, typeFilter, timeFilter]);

  const stats = useMemo(() => {
    if (filteredTransactions.length === 0) {
      return {
        totalTransactions: 0,
        totalVolume: 0,
        highestTransaction: 0,
        lowestTransaction: 0,
      };
    }

    const amounts = filteredTransactions.map((t) => Number(t.amount));
    const totalVolume = amounts.reduce((sum, amount) => sum + amount, 0);
    const highestTransaction = Math.max(...amounts);
    const lowestTransaction = Math.min(...amounts);

    return {
      totalTransactions: filteredTransactions.length,
      totalVolume,
      highestTransaction,
      lowestTransaction,
    };
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const data = filteredTransactions.reduce((acc, t) => {
      const date = formatDate(t.createdAt);
      if (!acc[date]) {
        acc[date] = { amount: 0, transactions: [] };
      }
      acc[date].amount += Number(t.amount);
      acc[date].transactions.push(t);
      return acc;
    }, {} as Record<string, { amount: number, transactions: Transaction[] }>);

    return Object.entries(data)
      .map(([date, { amount, transactions }]) => ({ date, amount, transactions }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredTransactions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg max-w-xs w-full dark:text-gray-500">
          <p className="font-bold text-base mb-1">{label}</p>
          <p className="text-sm text-muted-foreground mb-3">Total Volume: ₹{data.amount.toLocaleString()}</p>
          <div className="max-h-48 overflow-y-auto space-y-3">
            {data.transactions.map((t: Transaction) => (
              <div key={t.id} className="text-xs border-t border-border/50 pt-2">
                <div className="flex justify-between">
                  <span className="font-semibold">User:</span>
                  <span>{t.sender.phoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Amount:</span>
                  <span>₹{Number(t.amount).toLocaleString()}</span>
                </div>
                {t.transactionType === 'IMPS' && t.beneficiary && t.beneficiary.accountNumber && (
                   <div className="flex justify-between">
                      <span className="font-semibold">A/C:</span>
                      <span>{t.beneficiary.accountNumber}</span>
                   </div>
                )}
                {t.transactionType === 'DMT' && t.dmtBeneficiary && t.dmtBeneficiary.accountNumber && (
                   <div className="flex justify-between">
                      <span className="font-semibold">A/C:</span>
                      <span>{t.dmtBeneficiary.accountNumber}</span>
                   </div>
                )}
                {t.transactionType === 'UPI' && t.upiBeneficiary && t.upiBeneficiary.upiId && (
                  <div className="flex justify-between">
                      <span className="font-semibold">UPI:</span>
                      <span>{t.upiBeneficiary.upiId}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }
  
    return null;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Transaction Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Transactions"
            value={stats.totalTransactions.toLocaleString()}
            icon={<ArrowRight className="h-5 w-5" />}
          />
          <StatCard
            title="Total Volume"
            value={`₹${stats.totalVolume.toLocaleString()}`}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatCard
            title="Highest Transaction"
            value={`₹${stats.highestTransaction.toLocaleString()}`}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatCard
            title="Lowest Transaction"
            value={`₹${stats.lowestTransaction.toLocaleString()}`}
            icon={<TrendingDown className="h-5 w-5" />}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Input
              placeholder="Search by ID, phone, or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Transaction Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="DMT">DMT</SelectItem>
                  <SelectItem value="IMPS">IMPS</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="thisWeek">This Week</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
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
import { Button } from '../../components/ui/button'; // Added this line
import StatCard from '../../components/StatCard';
import { DollarSign, TrendingUp, TrendingDown, ArrowRight, Filter } from 'lucide-react'; // Added Filter
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
  transactionId: string;
  gateway: string;
  amount: number;
  transactionType: string;
  transactionStatus: string;
  createdAt: string;
  utr?: string; // Added UTR field
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
  const [showAdvancedSearchOptions, setShowAdvancedSearchOptions] = useState(false);
  const [selectedAdvanceSearchFields, setSelectedAdvanceSearchFields] = useState<string[]>([]);
  const [advanceSearchValues, setAdvanceSearchValues] = useState<{[key: string]: string}>({});

  useEffect(() => {
    fetchTransactions();
  }, [searchQuery, timeFilter, typeFilter, selectedAdvanceSearchFields, advanceSearchValues]); // Added dependencies

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
      let apiUrl = '/api/admin/transactions?';
      const params = new URLSearchParams();

      if (searchQuery) {
        params.append('searchTerm', searchQuery);
      }
      if (typeFilter !== 'all') {
        params.append('transactionType', typeFilter);
      }
      if (showAdvancedSearchOptions) {
        params.append('timeFilter', 'all'); // When advanced search is active, ignore timeFilter from dropdown
      } else if (timeFilter !== 'all') {
        params.append('timeFilter', timeFilter);
      }

      selectedAdvanceSearchFields.forEach(field => {
        if (advanceSearchValues[field]) {
          params.append(field, advanceSearchValues[field]);
        }
      });

      apiUrl += params.toString();

      const response = await fetch(apiUrl, {
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

  const handleAdvancedSearchFieldChange = (field: string) => {
    setSelectedAdvanceSearchFields((prevSelected) => {
      if (prevSelected.includes(field)) {
        const newSelected = prevSelected.filter((f) => f !== field);
        setAdvanceSearchValues((prevValues) => {
          const newValues = { ...prevValues };
          delete newValues[field];
          return newValues;
        });
        return newSelected;
      } else {
        return [...prevSelected, field];
      }
    });
  };

  const handleAdvancedSearchValueChange = (field: string, value: string) => {
    setAdvanceSearchValues((prevValues) => ({
      ...prevValues,
      [field]: value,
    }));
  };

  

  const stats = useMemo(() => {
    if (transactions.length === 0) {
      return {
        totalTransactions: 0,
        totalVolume: 0,
        highestTransaction: 0,
        lowestTransaction: 0,
      };
    }

    const amounts = transactions.map((t) => Number(t.amount));
    const totalVolume = amounts.reduce((sum, amount) => sum + amount, 0);
    const highestTransaction = Math.max(...amounts);
    const lowestTransaction = Math.min(...amounts);

    return {
      totalTransactions: transactions.length,
      totalVolume,
      highestTransaction,
      lowestTransaction,
    };
  }, [transactions]);

  const chartData = useMemo(() => {
    const data = transactions.reduce((acc, t) => {
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
  }, [transactions]);

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
          {loading ? (
            <>
              <div className="h-24 w-full rounded-lg bg-gray-200 animate-pulse"></div>
              <div className="h-24 w-full rounded-lg bg-gray-200 animate-pulse"></div>
              <div className="h-24 w-full rounded-lg bg-gray-200 animate-pulse"></div>
              <div className="h-24 w-full rounded-lg bg-gray-200 animate-pulse"></div>
            </>
          ) : (
            <>
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
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Volume</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-80 w-full rounded-lg bg-gray-200 animate-pulse"></div>
          ) : (
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
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-grow flex items-center gap-4"> {/* Added flex-grow and items-center */}
              <Input
                placeholder="Search by ID, phone, or email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Button onClick={() => setShowAdvancedSearchOptions(!showAdvancedSearchOptions)} variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  {showAdvancedSearchOptions ? 'Hide Advanced Search' : 'Advanced Search'}
              </Button>
            </div>
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

          {showAdvancedSearchOptions && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/40">
                <h3 className="text-lg font-semibold mb-4">Advanced Search Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Checkboxes for selecting fields */}
                    {[ 
                        { key: 'transactionId', label: 'Transaction ID' },
                        { key: 'referenceNo', label: 'Reference Number' },
                        { key: 'utr', label: 'UTR' },
                        { key: 'websiteUrl', label: 'Website Name' },
                        { key: 'senderAccount', label: 'Sender Account' },
                        { key: 'receiverName', label: 'Receiver Name' },
                        { key: 'accountUpiId', label: 'Account/UPI ID' },
                    ].map((field) => (
                        <div key={field.key} className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id={`adv-search-${field.key}`}
                                checked={selectedAdvanceSearchFields.includes(field.key)}
                                onChange={() => handleAdvancedSearchFieldChange(field.key)}
                                className="form-checkbox"
                            />
                            <label htmlFor={`adv-search-${field.key}`} className="text-sm font-medium text-muted-foreground">
                                {field.label}
                            </label>
                        </div>
                    ))}
                </div>

                {/* Input fields for selected fields */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedAdvanceSearchFields.map((fieldKey) => {
                        const fieldLabel = [
                            { key: 'transactionId', label: 'Transaction ID' },
                            { key: 'referenceNo', label: 'Reference Number' },
                            { key: 'utr', label: 'UTR' },
                            { key: 'websiteUrl', label: 'Website Name' },
                            { key: 'senderAccount', label: 'Sender Account' },
                            { key: 'receiverName', label: 'Receiver Name' },
                            { key: 'accountUpiId', label: 'Account/UPI ID' },
                        ].find(f => f.key === fieldKey)?.label || fieldKey;

                        return (
                            <div key={`input-${fieldKey}`}>
                                <label htmlFor={`adv-search-input-${fieldKey}`} className="block text-sm font-medium text-muted-foreground mb-1">
                                    {fieldLabel}
                                </label>
                                <Input
                                    id={`adv-search-input-${fieldKey}`}
                                    type="text"
                                    value={advanceSearchValues[fieldKey] || ''}
                                    onChange={(e) => handleAdvancedSearchValueChange(fieldKey, e.target.value)}
                                    className="w-full dark:text-black"
                                    placeholder={`Enter ${fieldLabel}`}
                                />
                            </div>
                        );
                    })}
                </div>
                <Button onClick={fetchTransactions} className="mt-6">
                    Apply Advanced Filters
                </Button>
            </div>
          )}
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
                  <TableHead>Gateway</TableHead>
                  <TableHead>UPI ID / Bank Details</TableHead>
                  <TableHead>UTR</TableHead> {/* Added UTR TableHead */}
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center"> {/* Updated colSpan */}
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction: Transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.transactionId}</TableCell>
                      <TableCell>{transaction.sender?.phoneNumber}</TableCell>
                      <TableCell>{getBeneficiaryName(transaction)}</TableCell>
                      <TableCell>₹{transaction.amount}</TableCell>
                      <TableCell>{transaction.transactionType}</TableCell>
                      <TableCell>{transaction.gateway}</TableCell>
                      <TableCell>
                        {transaction.transactionType === 'IMPS' && transaction.beneficiary?.accountNumber}
                        {transaction.transactionType === 'DMT' && transaction.dmtBeneficiary?.accountNumber}
                        {transaction.transactionType === 'UPI' && transaction.upiBeneficiary?.upiId}
                      </TableCell>
                      <TableCell>{transaction.utr || '-'}</TableCell> {/* Added UTR TableCell */}
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
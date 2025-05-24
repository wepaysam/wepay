"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Filter, ListChecks, AlertTriangle, CheckCircle2, XCircle, DollarSign, CalendarDays, Info } from "lucide-react";
import { Input } from "../components/ui/input"; // Assuming this path is correct and input is theme-aware
import { Button } from "../components/ui/button"; // Assuming this path is correct and button is theme-aware
// import { useToast } from "../../hooks/use-toast"; // Assuming you have this for notifications
// import { useTheme } from '../../contexts/ThemeContext'; // Assuming you have this for direct theme access if needed
import  MainLayout  from "../components/MainLayout"; // Assuming this is your main layout component
// Matches Prisma enum BalanceRequestStatus
type BalanceRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface BalanceRequestData {
  id: string;
  amount: number;
  UTRnumber: string;
  status: BalanceRequestStatus;
  requestedAt: string; // ISO date string
}

const sampleBalanceRequestsData: BalanceRequestData[] = [
  { id: 'br1', amount: 5000, UTRnumber: 'UTR1234567890', status: 'PENDING', requestedAt: new Date(2023, 10, 15, 10, 0).toISOString() },
  { id: 'br2', amount: 10000, UTRnumber: 'UTR0987654321', status: 'APPROVED', requestedAt: new Date(2023, 10, 10, 14, 30).toISOString() },
  { id: 'br3', amount: 2500, UTRnumber: 'UTR1122334455', status: 'REJECTED', requestedAt: new Date(2023, 10, 5, 9, 15).toISOString() },
  { id: 'br4', amount: 7500, UTRnumber: 'UTR5566778899', status: 'PENDING', requestedAt: new Date(2023, 11, 1, 11, 0).toISOString() },
];

const BalanceRequestsPage = () => {
  // const { toast } = useToast(); // Uncomment if using toast
  // const { theme } = useTheme(); // Uncomment if needed for specific conditional styling beyond Tailwind's `dark:` prefix
  const [balanceRequests, setBalanceRequests] = useState<BalanceRequestData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<BalanceRequestStatus | "ALL">("ALL");

  useEffect(() => {
    setBalanceRequests(sampleBalanceRequestsData);
  }, []);

  const filteredRequests = useMemo(() => {
    return balanceRequests.filter(req => {
      const matchesSearchTerm = req.UTRnumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                req.amount.toString().includes(searchTerm);
      const matchesStatus = statusFilter === "ALL" || req.status === statusFilter;
      return matchesSearchTerm && matchesStatus;
    });
  }, [balanceRequests, searchTerm, statusFilter]);

  const getStatusBadge = (status: BalanceRequestStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2 py-1 text-xs font-semibold text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-500/20 border border-yellow-300 dark:border-yellow-600 rounded-full flex items-center">
            <AlertTriangle className="w-3 h-3 mr-1" />Pending
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2 py-1 text-xs font-semibold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-500/20 border border-green-300 dark:border-green-600 rounded-full flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-1" />Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-1 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-600 rounded-full flex items-center">
            <XCircle className="w-3 h-3 mr-1" />Rejected
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/20 border border-gray-300 dark:border-gray-600 rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    // Use MainLayout if this is part of it, otherwise, ensure the root div has bg-background
    // For standalone page: <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-8">
    <MainLayout location="/balancerequest">
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-8">
        <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      // Using bg-card as this is likely a content card within a layout
      className="w-full max-w-3xl bg-card text-foreground rounded-2xl shadow-lg border border-border p-6 sm:p-8"
    >
      <div className="text-center mb-8">
        <ListChecks className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-primary" />
        <h1 className="text-2xl sm:text-3xl font-bold">My Balance Requests</h1>
        <p className="text-sm text-muted-foreground">Track the status of your balance top-up requests.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <label htmlFor="searchUtr" className="block text-sm font-medium text-muted-foreground mb-1">Search by UTR/Amount</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            {/* Assuming your Input component is theme-aware from ui/input */}
            <Input
              id="searchUtr"
              type="text"
              placeholder="Enter UTR or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full" // Removed specific bg/border/text, should be handled by ui/input
            />
          </div>
        </div>
        <div>
          <label htmlFor="statusFilter" className="block text-sm font-medium text-muted-foreground mb-1">Filter by Status</label>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BalanceRequestStatus | "ALL")}
              // Theme-aware select styling
              className="pl-10 pr-8 block w-full py-2.5 bg-background border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary rounded-md appearance-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        {filteredRequests.length > 0 ? (
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">UTR Number</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                    {new Date(req.requestedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                    ₹{req.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground font-mono">{req.UTRnumber}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {getStatusBadge(req.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-10">
            <Info className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No balance requests found matching your criteria.</p>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-4 text-center">
        Showing {filteredRequests.length} of {balanceRequests.length} requests.
      </p>
    </motion.div>
    </div>
    </MainLayout>
    // </div> // Closing for standalone page
  );
};

export default BalanceRequestsPage;
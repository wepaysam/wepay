"use client";
import React, { useEffect, useState } from "react";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useRouter } from "next/navigation";
import { 
  Search, 
  CheckCircle, 
  XCircle,
  Clock,
  Check,
  X
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "../../components/ui/badge";

interface BalanceRequest {
  id: string;
  userId: string;
  amount: number;
  UTRnumber: string;
  status: string; // 'PENDING', 'APPROVED', 'REJECTED'
  createdAt: string;
  updatedAt: string;
  user: {
    phoneNumber: string;
    email: string | null;
  };
}

export default function BalanceRequests() {
  const { toast } = useToast();
  const router = useRouter();
  const [requests, setRequests] = useState<BalanceRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<BalanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    requestId: string | null;
    action: 'approve' | 'reject' | null;
  }>({
    isOpen: false,
    requestId: null,
    action: null
  });

  useEffect(() => {
    const fetchBalanceRequests = async () => {
      try {
        // Get token from document.cookie
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
        
        const response = await fetch('/api/admin/balance-requests', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch balance requests');
        }

        const data = await response.json();
        setRequests(data);
        setFilteredRequests(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load balance requests",
          variant: "destructive",
        });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalanceRequests();
  }, [toast, router]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    if (!query) {
      setFilteredRequests(requests);
      return;
    }
    
    const filtered = requests.filter(
      request => 
        request.user.phoneNumber.includes(query) ||
        (request.user.email && request.user.email.toLowerCase().includes(query)) ||
        request.id.toLowerCase().includes(query) ||
        request.amount.toString().includes(query) ||
        request.status.toLowerCase().includes(query)
    );
    
    setFilteredRequests(filtered);
  };

  const openConfirmDialog = (requestId: string, action: 'approve' | 'reject') => {
    setConfirmDialog({
      isOpen: true,
      requestId,
      action
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({
      isOpen: false,
      requestId: null,
      action: null
    });
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      // Get token from document.cookie
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
      
      const response = await fetch(`/api/admin/balance-requests/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to approve balance request');
      }

      toast({
        title: "Success",
        description: "Balance request has been approved successfully",
      });

      // Update the request in the list
      const updatedRequests = requests?.map(request => 
        request.id === requestId ? { ...request, status: 'APPROVED' } : request
      );
      
      setRequests(updatedRequests);
      setFilteredRequests(
        filteredRequests?.map(request => 
          request.id === requestId ? { ...request, status: 'APPROVED' } : request
        )
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve balance request",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      closeConfirmDialog();
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      // Get token from document.cookie
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
      
      const response = await fetch(`/api/admin/balance-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to reject balance request');
      }

      toast({
        title: "Success",
        description: "Balance request has been rejected",
      });

      // Update the request in the list
      const updatedRequests = requests?.map(request => 
        request.id === requestId ? { ...request, status: 'REJECTED' } : request
      );
      
      setRequests(updatedRequests);
      setFilteredRequests(
        filteredRequests?.map(request => 
          request.id === requestId ? { ...request, status: 'REJECTED' } : request
        )
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject balance request",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      closeConfirmDialog();
    }
  };

  const handleConfirmAction = () => {
    if (!confirmDialog.requestId || !confirmDialog.action) return;
    
    if (confirmDialog.action === 'approve') {
      handleApproveRequest(confirmDialog.requestId);
    } else {
      handleRejectRequest(confirmDialog.requestId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"><Check className="h-3 w-3" /> Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1"><X className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Balance Requests</h1>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            className="pl-8"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>UTR Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No balance requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests?.map(request => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.id.slice(0, 8)}...</TableCell>
                    <TableCell>
                      <div>
                        <div>{request.user.phoneNumber}</div>
                        {request.user.email && (
                          <div className="text-xs text-muted-foreground">{request.user.email}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(request.amount)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {request.UTRnumber || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openConfirmDialog(request.id, 'approve')}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openConfirmDialog(request.id, 'reject')}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={closeConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === 'approve' ? 'Approve Balance Request' : 'Reject Balance Request'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action === 'approve' 
                ? 'Are you sure you want to approve this balance request? The amount will be added to the user\'s balance.'
                : 'Are you sure you want to reject this balance request? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={closeConfirmDialog}>Cancel</Button>
            <Button 
              onClick={handleConfirmAction}
              variant={confirmDialog.action === 'approve' ? 'default' : 'destructive'}
            >
              {confirmDialog.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

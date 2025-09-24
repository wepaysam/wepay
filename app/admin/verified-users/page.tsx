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
import { Button } from '../../components/ui/button';
import { Info, MinusCircle, DollarSign } from 'lucide-react';
import UserDetailsPopup, { User, Director, CompanyDocument, OfficePhoto } from '../../components/UserDetailsPopup';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";

interface VerifiedUser extends User {
  transactionCount: number;
  totalTransactionValue: number;
}

export default function VerifiedUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<VerifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<VerifiedUser | null>(null);
  const [isDeductBalanceModalOpen, setIsDeductBalanceModalOpen] = useState(false);
  const [deductAmount, setDeductAmount] = useState('');
  const [deductReason, setDeductReason] = useState('');
  const [userToDeduct, setUserToDeduct] = useState<VerifiedUser | null>(null);

  useEffect(() => {
    fetchVerifiedUsers();
  }, []);

  const fetchVerifiedUsers = async () => {
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
      const response = await fetch('/api/admin/verified-users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      const fetchedUsers = Array.isArray(data.users) ? data.users : [];
      setUsers(fetchedUsers);

      // If a user is currently selected, find the updated version and set it
      if (selectedUser) {
        const updatedSelectedUser = fetchedUsers.find(user => user.id === selectedUser.id);
        if (updatedSelectedUser) {
          setSelectedUser(updatedSelectedUser);
          console.log('Updated selectedUser after fetch:', updatedSelectedUser);
        } else {
          // If the selected user is no longer in the list (e.g., deleted), close the popup
          setSelectedUser(null);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching verified users:', error);
      setUsers([]);
      setLoading(false);
    }
  };

  const handleOpenPopup = (user: VerifiedUser) => {
    setSelectedUser(user);
  };

  const handleClosePopup = () => {
    setSelectedUser(null);
  };

  const handleOpenDeductModal = (user: VerifiedUser) => {
    setUserToDeduct(user);
    setIsDeductBalanceModalOpen(true);
    setDeductAmount(''); // Clear previous input
    setDeductReason(''); // Clear previous input
  };

  const handleCloseDeductModal = () => {
    setIsDeductBalanceModalOpen(false);
    setUserToDeduct(null);
  };

  const handleDeductBalance = async () => {
    if (!userToDeduct || !deductAmount || !deductReason) {
      toast({
        title: "Error",
        description: "Please enter amount and reason for deduction.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(deductAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid positive amount.",
        variant: "destructive",
      });
      return;
    }

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

      const response = await fetch(`/api/admin/users/${userToDeduct.id}/deduct-balance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, reason: deductReason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to deduct balance');
      }

      toast({
        title: "Success",
        description: `Successfully deducted ₹${amount} from ${userToDeduct.fullName || userToDeduct.phoneNumber}'s balance.`, 
      });
      handleCloseDeductModal();
      fetchVerifiedUsers(); // Refresh the user list to show updated balance
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to deduct balance.",
        variant: "destructive",
      });
      console.error('Error deducting balance:', error);
    }
  };

  

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Verified Users</CardTitle>
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
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Wallet Balance</TableHead>
                  <TableHead>User Type</TableHead>
                  <TableHead>Total Transactions</TableHead>
                  <TableHead>Total Transaction Value</TableHead>
                  <TableHead>Actions</TableHead>
                  
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No verified users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.fullName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phoneNumber}</TableCell>
                      <TableCell>₹{Number(user.balance).toLocaleString()}</TableCell>
                      <TableCell>{user.userType}</TableCell>
                      <TableCell>{user.transactionCount}</TableCell>
                      <TableCell>₹{Number(user.totalTransactionValue).toLocaleString()}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleOpenPopup(user)}>
                          <Info className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleOpenDeductModal(user)} title="Deduct Balance">
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {selectedUser && (
        <UserDetailsPopup user={selectedUser} onClose={handleClosePopup} onSaveSuccess={fetchVerifiedUsers} />
      )}

      {/* Deduct Balance Modal */}
      <Dialog open={isDeductBalanceModalOpen} onOpenChange={setIsDeductBalanceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deduct Balance from {userToDeduct?.fullName || userToDeduct?.phoneNumber}</DialogTitle>
            <DialogDescription>
              Enter the amount to deduct and a reason for this adjustment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deductAmount" className="text-right">
                Amount
              </Label>
              <Input
                id="deductAmount"
                type="number"
                value={deductAmount}
                onChange={(e) => setDeductAmount(e.target.value)}
                className="col-span-3"
                placeholder="e.g., 100.00"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deductReason" className="text-right">
                Reason
              </Label>
              <Textarea
                id="deductReason"
                value={deductReason}
                onChange={(e) => setDeductReason(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Incorrect credit, service charge"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDeductModal}>Cancel</Button>
            <Button onClick={handleDeductBalance}>Deduct</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


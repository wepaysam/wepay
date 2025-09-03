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
import { Info } from 'lucide-react';
import UserPermissionsPopup from '../../components/UserPermissionsPopup';

interface VerifiedUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  balance: number;
  transactionCount: number;
  totalTransactionValue: number;
}

export default function VerifiedUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<VerifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<VerifiedUser | null>(null);

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
      setUsers(Array.isArray(data.users) ? data.users : []);
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
                  <TableHead>Total Transactions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
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
                      <TableCell>{user.transactionCount}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="icon" onClick={() => handleOpenPopup(user)}>
                          <Info className="h-4 w-4" />
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
        <UserPermissionsPopup user={selectedUser} onClose={handleClosePopup} />
      )}
    </div>
  );
}


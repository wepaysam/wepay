'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useToast } from '../../hooks/use-toast'; // You'll use this later
import { User as UserIcon, CreditCard, FileText, CheckCircle, XCircle, Eye, Search, Trash2, Loader2 } from "lucide-react";
// Link and Image are not used currently, can be removed if not planned
// import Link from "next/link";
// import Image from "next/image";

import UserDetailsPopup, { User } from '../../components/UserDetailsPopup';

export default function UnverifiedUsers() {
  const { toast } = useToast(); // Prepare for future use
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<{ [key: string]: 'verify' | 'delete' | null }>({});
  const [selectedUser, setSelectedUser] = useState<User | null>(null);


  useEffect(() => {
    const fetchUnverifiedUsers = async () => {
      setIsLoading(true); // Set loading at the start of the fetch
      try {
        const token = typeof document !== 'undefined'
          ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1")
          : null;
        if (!token) {
          // toast({ title: "Authentication Error", description: "Please log in.", variant: "destructive" }); // For next update
          console.error("Authentication Error: Please log in.");
          router.push('/Auth/login');
          return;
        }

        const response = await fetch('/api/admin/unverified-users', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to fetch unverified users: ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        setUsers(data);
        setFilteredUsers(data);
      } catch (error: any) {
        // toast({ title: "Error", description: error.message || "Failed to load users.", variant: "destructive" }); // For next update
        console.error("Fetch Unverified Users Error:", error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnverifiedUsers();
  }, [router]); // Removed toast from dependency for now

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    if (!query) {
      setFilteredUsers(users);
      return;
    }
    const filtered = users.filter(user =>
      user.phoneNumber.includes(query) ||
      (user.email && user.email.toLowerCase().includes(query)) ||
      (user.userType && user.userType.toLowerCase().includes(query))
    );
    setFilteredUsers(filtered);
  };

  const handleVerifyUser = async (userId: string) => {
    setActionLoading(prev => ({ ...prev, [userId]: 'verify' }));
    try {
      const token = typeof document !== 'undefined' ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1") : null;
      if (!token) {
        // toast({ title: "Authentication Error", description: "Please log in.", variant: "destructive" });
        console.error("Authentication Error: Please log in.");
        router.push('/Auth/login');
        return;
      }

      const response = await fetch(`/api/admin/verify-user/${userId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to verify user');
      }

      // toast({ title: "Success", description: "User verified successfully." }); // For next update
      console.log("User verified successfully.");
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      setFilteredUsers(prevFiltered => prevFiltered.filter(user => user.id !== userId));
      setSelectedUser(null);

    } catch (error: any) {
      // toast({ title: "Error", description: error.message || "Failed to verify user.", variant: "destructive" }); // For next update
      console.error("Verify User Error:", error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    // Confirmation dialog
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [userId]: 'delete' }));
    try {
      const token = typeof document !== 'undefined' ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1") : null;
      if (!token) {
        // toast({ title: "Authentication Error", description: "Please log in.", variant: "destructive" });
        console.error("Authentication Error: Please log in.");
        router.push('/Auth/login');
        return;
      }

      // Make sure your API endpoint is `/api/admin/delete-user/${userId}` or similar
      // And it expects a DELETE request.
      const response = await fetch(`/api/admin/delete-user/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete user');
      }

      // toast({ title: "Success", description: "User deleted successfully." }); // For next update
      console.log("User deleted successfully.");
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      setFilteredUsers(prevFiltered => prevFiltered.filter(user => user.id !== userId));

    } catch (error: any) {
      // toast({ title: "Error", description: error.message || "Failed to delete user.", variant: "destructive" }); // For next update
      console.error("Delete User Error:", error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  const openDocumentInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]"> {/* Adjusted height for better centering */}
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Unverified Users</h1>
          <div className="relative w-full sm:w-72"> {/* Adjusted width */}
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by phone, email, Aadhaar, PAN..."
              className="pl-10" // Increased padding for icon
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>

        {filteredUsers?.length === 0 ? (
          <div className="text-center py-16"> {/* Increased padding */}
                        <UserIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">
              {searchQuery ? "No users match your search." : "No unverified users found."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {filteredUsers?.map(user => (
              <Card key={user.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                    {/* User & KYC Info Section */}
                    <div className="flex-grow space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Phone Number</p>
                          <p className="font-medium">{user.phoneNumber}</p>
                        </div>
                        {user.email && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Email Address</p>
                            <p className="font-medium break-all">{user.email}</p>
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">User Type</p>
                          <p className="font-medium">{user.userType}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions Section */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-center gap-2 lg:w-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pl-6">
                      <Button
                        onClick={() => setSelectedUser(user)}
                        variant="outline"
                        className="w-full sm:w-auto lg:w-full"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button
                        onClick={() => handleVerifyUser(user.id)}
                        disabled={actionLoading[user.id] === 'verify' || actionLoading[user.id] === 'delete'}
                        className="w-full sm:w-auto lg:w-full"
                        variant="default"
                      >
                        {actionLoading[user.id] === 'verify' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Verify
                      </Button>
                      <Button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={actionLoading[user.id] === 'delete' || actionLoading[user.id] === 'verify'}
                        variant="destructive"
                        className="w-full sm:w-auto lg:w-full"
                      >
                        {actionLoading[user.id] === 'delete' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {selectedUser && (
        <UserDetailsPopup user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}
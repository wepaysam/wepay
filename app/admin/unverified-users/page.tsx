'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useToast } from '../../hooks/use-toast';
import { 
  CreditCard, 
  FileText, 
  User,
  CheckCircle,
  XCircle,
  Eye,
  Search
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface User {
  id: string;
  phoneNumber: string;
  email: string | null;
  aadhaarNumber: string;
  aadhaarCardUrl: string;
  panCardNumber: string;
  panCardUrl: string;
}

export default function UnverifiedUsers() {
  const { toast } = useToast();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  

  useEffect(() => {
    const fetchUnverifiedUsers = async () => {
      try {
        // Get token from document.cookie
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
        
        const response = await fetch('/api/admin/unverified-users', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        console.log("Unverified users API Response status:", response);

        if (!response.ok) {
          if (response.status === 401) {
            console.error("Dashboard API returned 401 Unauthorized");
            // Let the global context handle the logout
            // await refreshUserData(); // This will check auth and logout if needed
            return;
          }
          
          // For other errors, just show an error message
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to fetch dashboard data: ${errorData.message || response.statusText}`);

        }

        const data = await response.json();
        setUsers(data);
        setFilteredUsers(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load unverified users",
          variant: "destructive",
        });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnverifiedUsers();
  }, [toast, router]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    if (!query) {
      setFilteredUsers(users);
      return;
    }
    
    const filtered = users.filter(
      user => 
        user.phoneNumber.includes(query) ||
        (user.email && user.email.toLowerCase().includes(query)) ||
        user.aadhaarNumber.includes(query) ||
        user.panCardNumber.toLowerCase().includes(query)
    );
    
    setFilteredUsers(filtered);
  };

  const handleVerifyUser = async (userId: string) => {
    try {
      // Get token from document.cookie
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
      
      const response = await fetch(`/api/admin/verify-user/${userId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to verify user');
      }

      toast({
        title: "Success",
        description: "User has been verified successfully",
      });

      // Remove the verified user from the list
      setUsers(users.filter(user => user.id !== userId));
      setFilteredUsers(filteredUsers.filter(user => user.id !== userId));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify user",
        variant: "destructive",
      });
      console.error(error);
    }
  };

  const openDocumentInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Unverified Users</h1>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-8"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>

        {filteredUsers?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No unverified users found</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredUsers?.map(user => (
              <Card key={user.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <div className="space-y-2 flex-1">
                      <h3 className="font-semibold">User Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Phone:</span>
                          <span className="font-medium">{user.phoneNumber}</span>
                        </div>
                        {user.email && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-medium">{user.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 flex-1">
                      <h3 className="font-semibold">KYC Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Aadhaar:</span>
                          <span className="font-medium">{user.aadhaarNumber}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openDocumentInNewTab(user.aadhaarCardUrl)}
                            title="View Aadhaar Card"
                          >
                            <FileText className="h-4 w-4 text-primary" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">PAN:</span>
                          <span className="font-medium">{user.panCardNumber}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openDocumentInNewTab(user.panCardUrl)}
                            title="View PAN Card"
                          >
                            <CreditCard className="h-4 w-4 text-primary" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <Button 
                        onClick={() => handleVerifyUser(user.id)}
                        className="flex gap-2 items-center"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Verify User
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

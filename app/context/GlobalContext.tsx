'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// Define types based on your Prisma schema
interface User {
  id: string;
  email: string | null;
  phoneNumber: string;
  userType: 'ADMIN' | 'VERIFIED' | 'UNVERIFIED';
  balance: number;
  aadhaarNumber: string | null;
  panCardNumber: string | null;
  aadhaarCardUrl: string | null;
  panCardUrl: string | null;
  isKycVerified: boolean;
  impsPermissions?: {
    enabled?: boolean;
    aeronpay?: boolean;
    sevapay_kelta?: boolean;
    sevapay_weshubh?: boolean;
  };
  upiPermissions?: {
    enabled?: boolean;
    aeronpay?: boolean;
    p2i?: boolean;
  };
  dmtPermissions?: {
    enabled?: boolean;
    sevapay_kelta?: boolean;
    sevapay_weshubh?: boolean;
  };
}

interface Transaction {
  id: string;
  txnId: string;
  amount: string;
  totalAmount: string;
  status: string;
  receiverName: string;
  date: string;
  time: string;
}

interface Beneficiary {
  id: string;
  accountNumber: string;
  accountHolderName: string;
  transactionType: string;
}

interface BalanceRequest {
  id: string;
  amount: string;
  UTRnumber: string;
  isConfirmed: boolean;
  isRejected: boolean;
  requestedAt: string;
}

interface GlobalContextType {
  user: User | null;
  isLogged: boolean;
  loading: boolean;
  transactions: Transaction[];
  beneficiaries: Beneficiary[];
  balanceRequests: BalanceRequest[];
  isSidebarOpen: boolean;
  setUser: (user: User | null) => void;
  setIsLogged: (isLogged: boolean) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setBeneficiaries: (beneficiaries: Beneficiary[]) => void;
  setBalanceRequests: (balanceRequests: BalanceRequest[]) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  logout: () => void;
  refreshUserData: () => Promise<void>;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};

interface GlobalProviderProps {
  children: ReactNode;
}

export function GlobalProvider({ children }: GlobalProviderProps) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLogged, setIsLoggedState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactionsState] = useState<Transaction[]>([]);
  const [beneficiaries, setBeneficiariesState] = useState<Beneficiary[]>([]);
  const [balanceRequests, setBalanceRequestsState] = useState<BalanceRequest[]>([]);
  const [isSidebarOpen, setSidebarOpenState] = useState(true);
  const router = useRouter();

  const setUser = (newUser: User | null) => {
    console.log("Setting user:", newUser);
    setUserState(newUser);
    
    // Ensure isLogged is consistent with user state
    if (!newUser && isLogged) {
      console.log("User is null/undefined but isLogged was true. Setting isLogged to false for consistency");
      setIsLoggedState(false);
    }
  };
  
  const setIsLogged = (newIsLogged: boolean) => {
    // Ensure we don't set isLogged to true if user is null/undefined
    if (newIsLogged && !user) {
      console.log("Attempted to set isLogged to true while user is null/undefined. Ignoring.");
      return;
    }
    
    setIsLoggedState(newIsLogged);
  };


  const setTransactions = (newTransactions: Transaction[]) => {
    setTransactionsState(newTransactions);
  };

  const setBeneficiaries = (newBeneficiaries: Beneficiary[]) => {
    setBeneficiariesState(newBeneficiaries);
  };

  const setBalanceRequests = (newBalanceRequests: BalanceRequest[]) => {
    setBalanceRequestsState(newBalanceRequests);
  };

  const setSidebarOpen = (isOpen: boolean) => {
    setSidebarOpenState(isOpen);
  };

  const logout = () => {
    // Clear cookie using document.cookie
    if (typeof document !== 'undefined') {
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
    setUser(null);
    setTransactions([]);
    setBeneficiaries([]);
    setBalanceRequests([]);
    setIsLogged(false);
    router.push('/Auth/login');
  };

  const refreshUserData = async () => {
    // Get token from document.cookie
    const token = typeof document !== 'undefined' 
      ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1")
      : null;
      
    if (!token) {
      logout();
      return;
    }

    try {
      // Fetch user profile - this is critical, so we'll throw an error if it fails
      const profileResponse = await fetch('/api/users/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const profileData = await profileResponse.json();
      
      // Use direct state setter to avoid validation issues
      if (profileData.user) {
        setUserState(profileData.user);
        setIsLoggedState(true);
        console.log("Profile data refreshed successfully:", profileData.user);
      } else {
        console.error("Profile API returned success but no user data");
      }

      // For non-critical endpoints, we'll catch errors individually and log them
      // but not trigger a logout
      
      // Fetch user's transactions
      try {
        const transactionsResponse = await fetch('/api/transactions', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          setTransactions(transactionsData.transactions || []);
        } else {
          console.warn('Failed to fetch transactions:', transactionsResponse.status);
        }
      } catch (txnError) {
        console.error('Error fetching transactions:', txnError);
        // Don't logout for this non-critical error
      }

      // Fetch user's beneficiaries
      try {
        const beneficiariesResponse = await fetch('/api/beneficiaries', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (beneficiariesResponse.ok) {
          const beneficiariesData = await beneficiariesResponse.json();
          setBeneficiaries(beneficiariesData || []);
        } else {
          console.warn('Failed to fetch beneficiaries:', beneficiariesResponse.status);
        }
      } catch (benefError) {
        console.error('Error fetching beneficiaries:', benefError);
        // Don't logout for this non-critical error
      }

      // Fetch user's balance requests
      try {
        const balanceRequestsResponse = await fetch('/api/balance-request', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (balanceRequestsResponse.ok) {
          const balanceRequestsData = await balanceRequestsResponse.json();
          setBalanceRequests(balanceRequestsData.balanceRequests || []);
        } else {
          console.warn('Failed to fetch balance requests:', balanceRequestsResponse.status);
        }
      } catch (balanceError) {
        console.error('Error fetching balance requests:', balanceError);
        // Don't logout for this non-critical error
      }
    } catch (error) {
      console.error('Error refreshing critical user data:', error);
      // Only logout for critical errors (profile fetch)
      logout();
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    const token = typeof document !== 'undefined' 
      ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1")
      : null;
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      console.log("Checking auth...", token);
      const response = await fetch('/api/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();
      
      // First set the user data
      setUserState(data.user);
      // Then set isLogged to true directly using setState to bypass the check
      setIsLoggedState(true);
      
      console.log("Auth successful, user set:", data.user);

      // Don't call refreshUserData here as it's causing issues
      // Instead, fetch additional data directly here
      
      // Fetch user's transactions
      // try {
      //   const transactionsResponse = await fetch('/api/transactions', {
      //     headers: {
      //       Authorization: `Bearer ${token}`
      //     }
      //   });

      //   if (transactionsResponse.ok) {
      //     const transactionsData = await transactionsResponse.json();
      //     console.log("Transactions fetched:", transactionsData);
      //     setTransactions(transactionsData.transactions || []);
      //   }
      // } catch (txnError) {
      //   console.error('Error fetching transactions:', txnError);
      // }

      // Fetch user's beneficiaries
      try {
        const beneficiariesResponse = await fetch('/api/beneficiaries', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (beneficiariesResponse.ok) {
          const beneficiariesData = await beneficiariesResponse.json();
          setBeneficiaries(beneficiariesData || []);
        }
      } catch (benefError) {
        console.error('Error fetching beneficiaries:', benefError);
      }

      // Fetch user's balance requests
      try {
        const balanceRequestsResponse = await fetch('/api/balance-request', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (balanceRequestsResponse.ok) {
          const balanceRequestsData = await balanceRequestsResponse.json();
          setBalanceRequests(balanceRequestsData.balanceRequests || []);
        }
      } catch (balanceError) {
        console.error('Error fetching balance requests:', balanceError);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log("User state updated:", user);
    console.log("isLogged state updated:", isLogged);
  }, [user, isLogged]);

  return (
    <GlobalContext.Provider 
      value={{ 
        user,
        isLogged,
        loading,
        transactions,
        beneficiaries,
        balanceRequests,
        isSidebarOpen,
        setUser,
        setIsLogged,
        setTransactions,
        setBeneficiaries,
        setBalanceRequests,
        setSidebarOpen,
        logout,
        refreshUserData
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { useToast } from '../../hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Plus } from 'lucide-react';

// Define the interface for a single charge
interface TransactionCharge {
  id: string;
  minAmount: number;
  maxAmount: number;
  charge: number;
}

// Define the interface for update data
interface UpdateChargeData {
  minAmount?: number;
  maxAmount?: number;
  charge?: number;
}

export default function TransactionChargesPage() {
  const [charges, setCharges] = useState<TransactionCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const [addDialog, setAddDialog] = useState(false);
  const [newCharge, setNewCharge] = useState({
    minAmount: 0,
    maxAmount: 0,
    charge: 0
  });

  useEffect(() => {
    fetchCharges();
  }, []);

  const fetchCharges = async () => {
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
      const response = await fetch('/api/admin/transaction-charges', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      console.log('Fetched charges:', data);
      setCharges(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching charges:', error);
      setCharges([]);
      setLoading(false);
    }
  };

  const handleUpdate = async (chargeId: string, data: UpdateChargeData) => {
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
      
      const response = await fetch(`/api/admin/transaction-charges/${chargeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      console.log('Update response:', response);
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Transaction charge updated successfully",
        });
        fetchCharges();
      } else {
        toast({
          title: "Error",
          description: "Failed to update transaction charge",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating charge:', error);
      toast({
        title: "Error",
        description: "Failed to update transaction charge",
        variant: "destructive",
      });
    }
  };

  const handleAddCharge = async () => {
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
      
      // Validate input
      if (newCharge.minAmount >= newCharge.maxAmount) {
        toast({
          title: "Invalid Input",
          description: "Maximum amount must be greater than minimum amount",
          variant: "destructive",
        });
        return;
      }
      
      if (newCharge.charge <= 0) {
        toast({
          title: "Invalid Input",
          description: "Charge amount must be greater than zero",
          variant: "destructive",
        });
        return;
      }
      
      const response = await fetch('/api/admin/transaction-charges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCharge),
      });

      console.log('Add response:', response);
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Transaction charge added successfully",
        });
        setAddDialog(false);
        setNewCharge({
          minAmount: 0,
          maxAmount: 0,
          charge: 0
        });
        fetchCharges();
      } else {
        toast({
          title: "Error",
          description: "Failed to add transaction charge",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding charge:', error);
      toast({
        title: "Error",
        description: "Failed to add transaction charge",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Transaction Charges</h1>
        <Button onClick={() => setAddDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Charge
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Transaction Charges</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Min Amount</TableHead>
                <TableHead>Max Amount</TableHead>
                <TableHead>Charge</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {charges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    No charges found
                  </TableCell>
                </TableRow>
              ) : (
                charges.map((charge: TransactionCharge) => (
                  <TableRow key={charge.id}>
                    <TableCell>₹{charge.minAmount}</TableCell>
                    <TableCell>₹{charge.maxAmount}</TableCell>
                    <TableCell>₹{charge.charge}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        className='dark:text-black'
                        onClick={() => handleUpdate(charge.id, {
                          charge: charge.charge
                        })}
                      >
                        Update
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Add Charge Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="dark:text-black">
          <DialogHeader>
            <DialogTitle>Add Transaction Charge</DialogTitle>
            <DialogDescription>
              Add a new transaction charge range and fee.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="minAmount" className="text-right">
                Min Amount (₹)
              </label>
              <Input
                id="minAmount"
                type="number"
                className="col-span-3"
                value={newCharge.minAmount}
                onChange={(e) => setNewCharge({...newCharge, minAmount: Number(e.target.value)})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="maxAmount" className="text-right">
                Max Amount (₹)
              </label>
              <Input
                id="maxAmount"
                type="number"
                className="col-span-3"
                value={newCharge.maxAmount}
                onChange={(e) => setNewCharge({...newCharge, maxAmount: Number(e.target.value)})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="charge" className="text-right">
                Charge (₹)
              </label>
              <Input
                id="charge"
                type="number"
                className="col-span-3"
                value={newCharge.charge}
                onChange={(e) => setNewCharge({...newCharge, charge: Number(e.target.value)})}
              />
            </div>
          </div>
          
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddCharge}>Add Charge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
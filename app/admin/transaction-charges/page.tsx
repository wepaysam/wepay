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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Plus } from 'lucide-react';

// Define the interface for a single charge
interface TransactionCharge {
  id: string;
  minAmount: number;
  maxAmount: number;
  charge: number;
  type: TransactionType; // Added type field
}

// Define the interface for update data
interface UpdateChargeData {
  minAmount?: number;
  maxAmount?: number;
  charge?: number;
  type?: TransactionType; // Added type field
}

enum TransactionType {
  NEFT = 'NEFT',
  IMPS = 'IMPS',
  UPI = 'UPI',
  DMT = 'DMT',
}


export default function TransactionChargesPage() {
  const [charges, setCharges] = useState<TransactionCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const [addDialog, setAddDialog] = useState(false);
  const [updateDialog, setUpdateDialog] = useState(false);
  const [editingCharge, setEditingCharge] = useState<TransactionCharge | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingChargeId, setDeletingChargeId] = useState<string | null>(null);
  const [newCharge, setNewCharge] = useState({
    minAmount: 0,
    maxAmount: 0,
    charge: 0,
    type: TransactionType.NEFT // Default type
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

  const handleUpdate = async (chargeId: string, updatedData: UpdateChargeData) => {
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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedData),
      });

      console.log('Update response:', response);
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Transaction charge updated successfully",
        });
        setUpdateDialog(false);
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
        body: JSON.stringify({
          minAmount: newCharge.minAmount,
          maxAmount: newCharge.maxAmount,
          charge: newCharge.charge,
          type: newCharge.type
        }),
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
          charge: 0,
          type: TransactionType.NEFT
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

  const handleDelete = async (chargeId: string) => {
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
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Transaction charge deleted successfully",
        });
        fetchCharges();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete transaction charge",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting charge:', error);
      toast({
        title: "Error",
        description: "Failed to delete transaction charge",
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
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {charges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No charges found
                  </TableCell>
                </TableRow>
              ) : (
                charges.map((charge: TransactionCharge) => (
                  <TableRow key={charge.id}>
                    <TableCell>₹{charge.minAmount}</TableCell>
                    <TableCell>₹{charge.maxAmount}</TableCell>
                    <TableCell>₹{charge.charge}</TableCell>
                    <TableCell>{charge.type}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        className='dark:text-black'
                        onClick={() => {
                        setEditingCharge(charge);
                        setUpdateDialog(true);
                      }}
                      >
                        Update
                      </Button>
                      <Button
                        variant="destructive"
                        className='ml-2'
                        onClick={() => {
                        setDeletingChargeId(charge.id);
                        setDeleteDialog(true);
                      }}
                      >
                        Delete
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
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="type" className="text-right">
                Type
              </label>
              <Select
                value={newCharge.type}
                onValueChange={(value) => setNewCharge({...newCharge, type: value as TransactionType})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TransactionType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddCharge}>Add Charge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      
      {/* Update Charge Dialog */}
      <Dialog open={updateDialog} onOpenChange={setUpdateDialog}>
        <DialogContent className="dark:text-black">
          <DialogHeader>
            <DialogTitle>Update Transaction Charge</DialogTitle>
            <DialogDescription>
              Update the transaction charge range, fee, and type.
            </DialogDescription>
          </DialogHeader>
          
          {editingCharge && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="minAmount" className="text-right">
                  Min Amount (₹)
                </label>
                <Input
                  id="minAmount"
                  type="number"
                  className="col-span-3"
                  value={editingCharge.minAmount}
                  onChange={(e) => setEditingCharge({...editingCharge, minAmount: Number(e.target.value)})}
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
                  value={editingCharge.maxAmount}
                  onChange={(e) => setEditingCharge({...editingCharge, maxAmount: Number(e.target.value)})}
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
                  value={editingCharge.charge}
                  onChange={(e) => setEditingCharge({...editingCharge, charge: Number(e.target.value)})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="type" className="text-right">
                  Type
                </label>
                <Select
                  value={editingCharge.type}
                  onValueChange={(value) => setEditingCharge({...editingCharge, type: value as TransactionType})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TransactionType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setUpdateDialog(false)}>Cancel</Button>
            <Button onClick={() => editingCharge && handleUpdate(editingCharge.id, editingCharge)}>Update Charge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Charge Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="dark:text-black">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the transaction charge.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (deletingChargeId) {
                handleDelete(deletingChargeId);
              }
              setDeleteDialog(false);
            }}>Yes, delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
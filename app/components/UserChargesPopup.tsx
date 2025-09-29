
'use client';
import { useState, useEffect } from 'react';
import { useToast } from '../hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Trash2, Edit } from 'lucide-react';

interface UserCharge {
  id: string;
  charge: number;
  minAmount: number;
  maxAmount: number;
  type: string;
}

interface UserChargesPopupProps {
  user: {
    id: string;
    fullName: string;
  };
  onClose: () => void;
}

export default function UserChargesPopup({ user, onClose }: UserChargesPopupProps) {
  const { toast } = useToast();
  const [charges, setCharges] = useState<UserCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<UserCharge | null>(null);
  const [newCharge, setNewCharge] = useState({
    charge: '',
    minAmount: '',
    maxAmount: '',
    type: 'IMPS',
  });

  useEffect(() => {
    fetchCharges();
  }, []);

  const fetchCharges = async () => {
    setLoading(true);
    try {
      const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, '$1');
      const response = await fetch(`/api/admin/users/${user.id}/charges`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setCharges(Array.isArray(data.charges) ? data.charges : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching charges:', error);
      setCharges([]);
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (isEditing) {
      setIsEditing({ ...isEditing, [name]: value });
    } else {
      setNewCharge({ ...newCharge, [name]: value });
    }
  };

  const handleSaveCharge = async () => {
    const chargeData = isEditing ? isEditing : newCharge;
    let url;
    let method;

    if (isEditing) {
      const editingCharge = isEditing as UserCharge; // Type assertion
      url = `/api/admin/users/${user.id}/charges/${editingCharge.id}`;
      method = 'PUT';
    } else {
      url = `/api/admin/users/${user.id}/charges`;
      method = 'POST';
    }

    try {
      const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, '$1');
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(chargeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save charge');
      }

      toast({
        title: 'Success',
        description: `Successfully saved charge for ${user.fullName}.`,
      });
      fetchCharges();
      setIsEditing(null);
      setNewCharge({
        charge: '',
        minAmount: '',
        maxAmount: '',
        type: 'IMPS',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save charge.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCharge = async (chargeId: string) => {
    try {
      const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, '$1');
      const response = await fetch(`/api/admin/users/${user.id}/charges/${chargeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete charge');
      }

      toast({
        title: 'Success',
        description: 'Successfully deleted charge.',
      });
      fetchCharges();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete charge.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Charges for {user.fullName}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="charge">Charge (%)</Label>
            <Input
              id="charge"
              name="charge"
              type="number"
              value={isEditing ? isEditing.charge : newCharge.charge}
              onChange={handleInputChange}
              className="col-span-3"
            />
            <Label htmlFor="minAmount">Min Amount</Label>
            <Input
              id="minAmount"
              name="minAmount"
              type="number"
              value={isEditing ? isEditing.minAmount : newCharge.minAmount}
              onChange={handleInputChange}
              className="col-span-3"
            />
            <Label htmlFor="maxAmount">Max Amount</Label>
            <Input
              id="maxAmount"
              name="maxAmount"
              type="number"
              value={isEditing ? isEditing.maxAmount : newCharge.maxAmount}
              onChange={handleInputChange}
              className="col-span-3"
            />
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              name="type"
              value={isEditing ? isEditing.type : newCharge.type}
              onChange={handleInputChange}
              className="col-span-3"
            >
              <option value="IMPS">IMPS</option>
              <option value="NEFT">NEFT</option>
              <option value="UPI">UPI</option>
              <option value="DMT">DMT</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSaveCharge}>{isEditing ? 'Save Changes' : 'Add Charge'}</Button>
          {isEditing && <Button variant="outline" onClick={() => setIsEditing(null)}>Cancel</Button>}
        </DialogFooter>
        <div className="mt-4">
          <h3 className="text-lg font-medium">Existing Charges</h3>
          {loading ? (
            <p>Loading charges...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Min Amount</TableHead>
                  <TableHead>Max Amount</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.map((charge) => (
                  <TableRow key={charge.id}>
                    <TableCell>{charge.type}</TableCell>
                    <TableCell>{charge.minAmount}</TableCell>
                    <TableCell>{charge.maxAmount}</TableCell>
                    <TableCell>{charge.charge}%</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setIsEditing(charge)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCharge(charge.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

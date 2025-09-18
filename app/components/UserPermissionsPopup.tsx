'use client';
import { useState } from 'react';
import { X, User, DollarSign, CreditCard, Smartphone, ArrowRight } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useRouter } from 'next/navigation';

// Mock Switch component
const Switch = ({ checked, onCheckedChange, disabled = false }) => {
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${disabled 
          ? 'bg-gray-200 cursor-not-allowed' 
          : checked 
            ? 'bg-blue-600 hover:bg-blue-700' 
            : 'bg-gray-200 hover:bg-gray-300'
        }
      `}
      disabled={disabled}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
};

// Mock Button component
const Button = ({ children, variant = 'default', size = 'default', onClick, className = '', ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  const variantClasses = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-blue-500'
  };
  
  const sizeClasses = {
    default: 'h-10 py-2 px-4',
    icon: 'h-10 w-10'
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

interface User {
  id: string;
  fullName: string;
  totalTransactionValue: number;
}

interface UserPermissionsPopupProps {
  user: User | null;
  onClose: () => void;
}

export default function UserPermissionsPopup({ user, onClose }: UserPermissionsPopupProps) {
  // State for permissions
  const [permissions, setPermissions] = useState({
    imps: { enabled: true, sevapay_weshubh: true, sevapay_kelta: true, aeronpay: true },
    upi: { enabled: true, aeronpay: true, p2i: true },
    dmt: { enabled: true },
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handlePermissionChange = (type: string, subType?: string) => {
    setPermissions(prev => {
      const newPermissions = JSON.parse(JSON.stringify(prev)); // Deep clone
      
      if (subType) {
        // Toggle the specific sub-permission
        newPermissions[type][subType] = !prev[type][subType];
        
        // Check if any sub-toggles are still enabled
        const subKeys = Object.keys(newPermissions[type]).filter(key => key !== 'enabled');
        const hasEnabledSub = subKeys.some(key => newPermissions[type][key]);
        
        // Update main toggle based on sub-toggles
        newPermissions[type].enabled = hasEnabledSub;
      } else {
        // Toggle the main permission
        const newEnabledState = !prev[type].enabled;
        newPermissions[type].enabled = newEnabledState;
        
        // Update all sub-toggles to match main toggle
        Object.keys(newPermissions[type]).forEach(key => {
          if (key !== 'enabled') {
            newPermissions[type][key] = newEnabledState;
          }
        });
      }
      
      return newPermissions;
    });
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/update-permissions/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update permissions');
      }

      toast({
        title: 'Success',
        description: 'User permissions updated successfully.',
        variant: 'default',
      });
      onClose();
      router.refresh(); // Refresh the page to reflect changes
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Mock user data if none provided
  const mockUser = {
    id: '1',
    fullName: 'John Doe',
    totalTransactionValue: 125000
  };

  const currentUser = user || mockUser;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded-full">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{currentUser.fullName}</h2>
              <p className="text-sm text-gray-500">Manage user permissions and view details</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 overflow-y-auto">
          {/* Total Transaction Value */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-center gap-4">
              <DollarSign className="h-8 w-8 text-gray-600" />
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Transaction Value</h3>
                <p className="text-3xl font-bold text-gray-900">₹{currentUser.totalTransactionValue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Transaction Permissions</h3>
            
            {/* Debug info */}
            <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
              Debug: {JSON.stringify(permissions, null, 2)}
            </div>
            
            {/* IMPS */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                  <h4 className="text-lg font-semibold text-gray-900">IMPS</h4>
                </div>
                <Switch
                  checked={permissions.imps.enabled}
                  onCheckedChange={() => handlePermissionChange('imps')}
                />
              </div>
              <div className="pl-9 space-y-4 border-l border-gray-200 ml-3">
                <PermissionRow 
                  label="SevaPay Weshubh" 
                  checked={permissions.imps.sevapay_weshubh} 
                  onCheckedChange={() => handlePermissionChange('imps', 'sevapay_weshubh')} 
                  disabled={!permissions.imps.enabled} 
                />
                <PermissionRow 
                  label="SevaPay Kelta" 
                  checked={permissions.imps.sevapay_kelta} 
                  onCheckedChange={() => handlePermissionChange('imps', 'sevapay_kelta')} 
                  disabled={!permissions.imps.enabled} 
                />
                <PermissionRow 
                  label="AeronPay" 
                  checked={permissions.imps.aeronpay} 
                  onCheckedChange={() => handlePermissionChange('imps', 'aeronpay')} 
                  disabled={!permissions.imps.enabled} 
                />
              </div>
            </div>

            {/* UPI */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-6 w-6 text-blue-600" />
                  <h4 className="text-lg font-semibold text-gray-900">UPI</h4>
                </div>
                <Switch
                  checked={permissions.upi.enabled}
                  onCheckedChange={() => handlePermissionChange('upi')}
                />
              </div>
              <div className="pl-9 space-y-4 border-l border-gray-200 ml-3">
                <PermissionRow 
                  label="AeronPay" 
                  checked={permissions.upi.aeronpay} 
                  onCheckedChange={() => handlePermissionChange('upi', 'aeronpay')} 
                  disabled={!permissions.upi.enabled} 
                />
                <PermissionRow 
                  label="P2I" 
                  checked={permissions.upi.p2i} 
                  onCheckedChange={() => handlePermissionChange('upi', 'p2i')} 
                  disabled={!permissions.upi.enabled} 
                />
              </div>
            </div>

            {/* DMT */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ArrowRight className="h-6 w-6 text-blue-600" />
                  <h4 className="text-lg font-semibold text-gray-900">DMT</h4>
                </div>
                <Switch
                  checked={permissions.dmt.enabled}
                  onCheckedChange={() => handlePermissionChange('dmt')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-4 p-6 border-t border-gray-200 mt-auto">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveChanges} disabled={isLoading}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}

const PermissionRow = ({ label, checked, onCheckedChange, disabled }) => (
  <div className="flex items-center justify-between">
    <span className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>{label}</span>
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
    />
  </div>
);

// Demo component to test the popup
export const Demo = () => {
  const [showPopup, setShowPopup] = useState(true);
  
  const mockUser = {
    id: '1',
    fullName: 'John Doe',
    totalTransactionValue: 125000
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">User Permissions Demo</h1>
        <Button onClick={() => setShowPopup(true)}>
          Open User Permissions
        </Button>
        
        {showPopup && (
          <UserPermissionsPopup
            user={mockUser}
            onClose={() => setShowPopup(false)}
          />
        )}
      </div>
    </div>
  );
};

// Export Demo as default for testing
// export { Demo as default };
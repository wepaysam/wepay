import React,{useState} from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { X, DollarSign, CreditCard, Smartphone, ArrowRight } from 'lucide-react';
import { Switch } from './ui/switch';

export interface Director {
  id: string;
  name: string;
  pan: string;
  aadhaar: string;
}

export interface CompanyDocument {
  id: string;
  url: string;
  documentType: string;
}

export interface OfficePhoto {
  id: string;
  url: string;
}

export interface User {
  id: string;
  fullName: string;
  balance: number;
  phoneNumber: string;
  email: string | null;
  userType: string;
  aadhaarNumber?: string;
  panCardNumber?: string;
  companyName?: string;
  companyCIN?: string;
  directors: Director[];
  documents: CompanyDocument[];
  officePhotos: OfficePhoto[];
  totalTransactionValue?: number;
  impsPermissions?: any;
  upiPermissions?: any;
  dmtPermissions?: any;
  isDisabled?: boolean;
}

interface UserDetailsPopupProps {
  user: User;
  onClose: () => void;
  onSaveSuccess: () => void;
}

const UserDetailsPopup: React.FC<UserDetailsPopupProps> = ({ user, onClose, onSaveSuccess }) => {
  const [permissions, setPermissions] = useState(() => ({
    imps: user.impsPermissions || { enabled: false, sevapay_weshubh: false, sevapay_kelta: false, aeronpay: false },
    upi: user.upiPermissions || { enabled: false, aeronpay: false, p2i: false },
    dmt: user.dmtPermissions || { enabled: false },
  }));
  const [isDisabled, setIsDisabled] = useState(user.isDisabled || false);
  const [isSaving, setIsSaving] = useState(false);

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
    setIsSaving(true);
    try {
      const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
      if (!token) {
        // Handle authentication error
        return;
      }

      console.log('Sending isDisabled to backend:', isDisabled);
      // Update user disabled status
      await fetch(`/api/admin/users/${user.id}/toggle-disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isDisabled }),
      });

      console.log('Sending permissions to backend:', permissions);
      // Update permissions
      const response = await fetch(`/api/admin/update-permissions/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ permissions }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save permissions');
      }

      console.log('Permissions saved successfully!');
      onSaveSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving changes:', error);
      // Handle error (e.g., show a toast)
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="absolute top-4 right-4">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Disable User</p>
            <Switch
              checked={isDisabled}
              onCheckedChange={(checked) => {
                console.log('Switch toggled to:', checked);
                setIsDisabled(checked);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Phone Number</p>
              <p>{user.phoneNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p>{user.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">User Type</p>
              <p>{user.userType}</p>
            </div>
            {user.totalTransactionValue !== undefined && (
              <div>
                <p className="text-sm font-medium text-gray-500">Total Transaction Value</p>
                <p>₹{user.totalTransactionValue.toLocaleString()}</p>
              </div>
            )}
          </div>
          {user.userType === 'PROPRIETOR_UNVERIFIED' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Aadhaar Number</p>
                <p>{user.aadhaarNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">PAN Number</p>
                <p>{user.panCardNumber}</p>
              </div>
            </div>
          )}
          {user.userType === 'COMPANY_UNVERIFIED' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Company Name</p>
                  <p>{user.companyName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Company CIN</p>
                  <p>{user.companyCIN}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Directors</p>
                <div className="grid grid-cols-1 gap-2">
                  {user.directors.map((director) => (
                    <div key={director.id} className="p-2 border rounded-md">
                      <p><strong>Name:</strong> {director.name}</p>
                      <p><strong>PAN:</strong> {director.pan}</p>
                      <p><strong>Aadhaar:</strong> {director.aadhaar}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          <div>
            <p className="text-sm font-medium text-gray-500">Documents</p>
            <div className="grid grid-cols-2 gap-2">
              {user.documents.map((doc) => (
                <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  {doc.documentType}
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Office Photos</p>
            <div className="grid grid-cols-4 gap-2">
              {user.officePhotos.map((photo) => (
                <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer">
                  <img src={photo.url} alt="Office Photo" className="w-full h-auto rounded-md" />
                </a>
              ))}
            </div>
          </div>
          {/* Permissions */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Transaction Permissions</h3>
            
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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

export default UserDetailsPopup;
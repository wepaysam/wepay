'use client';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Admin Phone Number</h3>
              <p>+91 1234567890</p>
            </div>
            {/* Add more settings as needed */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, Landmark, Hash, Loader2, ShieldAlert, Info, XCircle, ShieldCheck, Phone } from "lucide-react";
// import DashboardLayout from "../dashboard/layout"; // Adjust path as needed
import DashboardLayout from "../dashboard/layout";
import { useGlobalContext } from "../context/GlobalContext"; // Adjust path as needed
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button"; // For potential future actions
import Link from "next/link";

// Interface for user settings data
interface UserSettings {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string; // Added phone number as it's common
    bankAccountName?: string; // Name on the bank account
    bankAccountNumber?: string;
    ifscCode?: string;
    isKycVerified: boolean; // From your Prisma schema
    // Add any other relevant settings fields
}

// Sample User Settings Data
const sampleUserSettings: UserSettings = {
    id: "user123",
    fullName: "Rakesh Mittal",
    email: "rakesh.mittal@example.com",
    phoneNumber: "9999988888",
    bankAccountName: "Rakesh K Mittal",
    bankAccountNumber: "123456789012",
    ifscCode: "HDFC0001234",
    isKycVerified: true,
};

const SettingsPage = () => {
    const { user, isLogged, loading: globalLoading, refreshUserData } = useGlobalContext();
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
    const [isLoadingSettings, setIsLoadingSettings] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserSettings = async () => {
            setIsLoadingSettings(true);
            setError(null);
            try {
                // Simulate API call to fetch user settings
                // In a real app, this would be:
                // const token = ... get token ...
                // const response = await fetch('/api/user/settings', { headers: { 'Authorization': `Bearer ${token}` } });
                // if (!response.ok) throw new Error("Failed to fetch settings");
                // const data = await response.json();
                // setUserSettings(data);

                await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
                setUserSettings(sampleUserSettings); // Use sample data

            } catch (err: any) {
                setError(err.message || "Could not load your settings.");
                console.error("Settings fetch error:", err);
            } finally {
                setIsLoadingSettings(false);
            }
        };

        if (isLogged) {
            fetchUserSettings();
        }
    }, [isLogged]); // Re-fetch if login status changes

    const ReadOnlyField = ({ label, value, icon: Icon }: { label: string, value?: string | boolean | null, icon?: React.ElementType }) => {
        let displayValue: React.ReactNode = value ?? <span className="italic text-muted-foreground/70">Not Provided</span>;
        if (typeof value === 'boolean') {
            displayValue = value ? 
                <span className="font-semibold text-green-600 dark:text-green-400">Yes</span> : 
                <span className="font-semibold text-red-600 dark:text-red-400">No</span>;
        }

        return (
            <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt className="text-sm font-medium leading-6 text-muted-foreground flex items-center">
                    {Icon && <Icon className="h-4 w-4 mr-2 flex-shrink-0" />}
                    {label}
                </dt>
                <dd className="mt-1 text-sm leading-6 text-foreground sm:col-span-2 sm:mt-0">
                    {displayValue}
                </dd>
            </div>
        );
    };


    if (globalLoading || isLoadingSettings) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!isLogged && !globalLoading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                    <ShieldAlert className="h-16 w-16 text-destructive" />
                    <h2 className="text-xl font-semibold">Access Denied</h2>
                    <p className="text-muted-foreground">Please log in to view your settings.</p>
                    <Button ><Link href="/login">Login</Link></Button> {/* Assuming router is available or use window.location */}
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-4">
                    <XCircle className="h-16 w-16 text-destructive" />
                    <h2 className="text-xl font-semibold text-destructive">Error Loading Settings</h2>
                    <p className="text-muted-foreground">{error}</p>
                    <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
                </div>
            </DashboardLayout>
        );
    }
    
    if (!userSettings) {
         return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-4">
                    <Info className="h-16 w-16 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">No Settings Found</h2>
                    <p className="text-muted-foreground">We couldn&epos;t find any settings information for your account.</p>
                </div>
            </DashboardLayout>
        );
    }


    return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-8"
                >
                    <div className="text-center">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                            Account Settings
                        </h1>
                        <p className="mt-2 text-lg leading-8 text-muted-foreground">
                            View your personal and account details. These details are not editable here.
                        </p>
                    </div>

                    {/* Personal Information Card */}
                    <Card className="overflow-hidden">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                Personal Information
                            </CardTitle>
                            <CardDescription>
                                Your basic profile details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <dl className="divide-y divide-border">
                                <ReadOnlyField label="Full Name" value={userSettings.fullName} />
                                <ReadOnlyField label="Email Address" value={userSettings.email} icon={Mail} />
                                <ReadOnlyField label="Phone Number" value={userSettings.phoneNumber} icon={Phone} />
                                <ReadOnlyField label="KYC Verified" value={userSettings.isKycVerified} icon={ShieldCheck} />
                            </dl>
                        </CardContent>
                    </Card>

                    {/* Bank Account Details Card */}
                    <Card className="overflow-hidden">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Landmark className="h-5 w-5 text-primary" />
                                Bank Account Details
                            </CardTitle>
                            <CardDescription>
                                Your primary bank account linked for payouts (if any).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {userSettings.bankAccountNumber || userSettings.ifscCode ? (
                                <dl className="divide-y divide-border">
                                    <ReadOnlyField label="Account Holder Name" value={userSettings.bankAccountName} />
                                    <ReadOnlyField label="Account Number" value={userSettings.bankAccountNumber} icon={Hash} />
                                    <ReadOnlyField label="IFSC Code" value={userSettings.ifscCode} />
                                </dl>
                            ) : (
                                <div className="text-center py-6">
                                    <Info className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">No bank account details linked to your profile.</p>
                                </div>
                            )}
                        </CardContent>
                        {/* <CardFooter className="flex justify-end">
                            <Button variant="outline" disabled>Update Bank Details (Disabled)</Button>
                        </CardFooter> */}
                    </Card>
                    
                    <div className="text-center pt-4">
                        <p className="text-xs text-muted-foreground">
                            If you need to update any of this information, please contact support.
                        </p>
                    </div>

                </motion.div>
            </div>
        </DashboardLayout>
    );
};

export default SettingsPage;
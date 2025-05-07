"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Gift, CheckCircle, XCircle,SmartphoneIcon, PhoneIcon, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import MainLayout from "../components/MainLayout"; // Adjust path as needed
import { useGlobalContext } from "../context/GlobalContext"; // Adjust path as needed
import { Button } from "../components/ui/button"; // Assuming shadcn/ui setup
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";

// Define interfaces for API data (match these with your actual API responses)
interface Provider {
    id: string;
    name: string;
}

interface Pack {
    id: string;
    description: string;
    amount: number;
}

const RechargePage = () => {
    const { user, isLogged, loading: globalLoading, refreshUserData } = useGlobalContext();
    const [mobileNumber, setMobileNumber] = useState("");
    const [selectedProvider, setSelectedProvider] = useState<string>("");
    const [selectedPack, setSelectedPack] = useState<string>("");
    const [amount, setAmount] = useState<string>(""); // Store as string for input, convert to number for API

    const [providers, setProviders] = useState<Provider[]>([]);
    const [packs, setPacks] = useState<Pack[]>([]);

    const [isLoadingProviders, setIsLoadingProviders] = useState(false);
    const [isLoadingPacks, setIsLoadingPacks] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Fetch providers on component mount
    useEffect(() => {
        const fetchProviders = async () => {
            setIsLoadingProviders(true);
            setError(null);
            try {
                const response = await fetch('/api/recharge/providers');
                if (!response.ok) {
                    throw new Error('Failed to fetch providers');
                }
                const data: Provider[] = await response.json();
                setProviders(data);
            } catch (err: any) {
                setError(err.message || 'Could not load providers.');
                console.error("Provider fetch error:", err);
            } finally {
                setIsLoadingProviders(false);
            }
        };

        if (isLogged) { // Only fetch if user is logged in
             fetchProviders();
        }
    }, [isLogged]); // Re-run if login status changes

    // Fetch packs when provider changes
    useEffect(() => {
        // Don't fetch if no provider is selected
        if (!selectedProvider || !isLogged) {
            setPacks([]); // Clear packs if provider is deselected or user logs out
            setSelectedPack(""); // Reset selected pack
            setAmount(""); // Reset amount
            return;
        }

        const fetchPacks = async () => {
            setIsLoadingPacks(true);
            setError(null); // Clear previous errors
            setPacks([]); // Clear old packs immediately
            setSelectedPack(""); // Reset pack selection
            setAmount(""); // Reset amount
            try {
                // Pass mobile number too, if your API uses it to fetch specific plans
                const response = await fetch(`/api/recharge/packs?provider=${selectedProvider}&number=${mobileNumber}`);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch packs' }));
                    throw new Error(errorData.message || 'Failed to fetch packs');
                }
                const data: Pack[] = await response.json();
                setPacks(data);
            } catch (err: any) {
                setError(err.message || 'Could not load packs for this provider.');
                console.error("Pack fetch error:", err);
            } finally {
                setIsLoadingPacks(false);
            }
        };

        fetchPacks();
    }, [selectedProvider, mobileNumber, isLogged]); // Re-run if provider or mobile number changes

    // Update amount when pack changes
    useEffect(() => {
        if (selectedPack) {
            const packDetails = packs.find(p => p.id === selectedPack);
            if (packDetails) {
                setAmount(packDetails.amount.toString());
            } else {
                 setAmount(""); // Reset if selected pack not found (shouldn't happen ideally)
            }
        } else {
            setAmount(""); // Reset amount if no pack is selected
        }
    }, [selectedPack, packs]);

    const handleProviderChange = (value: string) => {
        setSelectedProvider(value);
        // Reset downstream states
        setSelectedPack("");
        setPacks([]);
        setAmount("");
        setError(null); // Clear errors when changing provider
        setSuccessMessage(null);
    };

     const handlePackChange = (value: string) => {
        setSelectedPack(value);
        setError(null); // Clear errors when changing pack
        setSuccessMessage(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        // Basic Frontend Validation
        if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
            setError("Please enter a valid 10-digit mobile number.");
            return;
        }
        if (!selectedProvider) {
            setError("Please select a service provider.");
            return;
        }
        if (!selectedPack && !amount) { // Allow manual amount entry if needed, else enforce pack selection
             setError("Please select a recharge pack or enter an amount.");
             return;
        }
         if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
             setError("Invalid recharge amount.");
             return;
         }


        setIsSubmitting(true);

        try {
            const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
            if (!token) {
                throw new Error("Authentication token not found. Please log in again.");
            }

            const response = await fetch('/api/recharge/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    mobileNumber: mobileNumber,
                    providerId: selectedProvider,
                    packId: selectedPack || null, // Send packId if selected
                    amount: parseFloat(amount), // Send amount as number
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                 // Use message from API response if available
                throw new Error(result.message || `Recharge failed with status: ${response.status}`);
            }

            // Success
            setSuccessMessage(`Recharge successful! Transaction ID: ${result.transactionId || 'N/A'}`);
            // Reset form partially or fully? Maybe just clear messages and disable submit until changes?
            // setMobileNumber(""); // Optional: Clear form on success
            // setSelectedProvider("");
            // setSelectedPack("");
            // setAmount("");
            refreshUserData(); // Refresh balance in global context

        } catch (err: any) {
            setError(err.message || "An unexpected error occurred during recharge.");
            console.error("Recharge submission error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle global loading state or if user is not logged in
     if (globalLoading) {
        return (
            <MainLayout location="recharge">
                 <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                 </div>
            </MainLayout>
        );
     }

     if (!isLogged && !globalLoading) {
         // You might want to redirect or show a login prompt
         // For now, just showing a message
         return (
             <MainLayout location="recharge">
                 <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                     <h2 className="text-xl font-semibold">Access Denied</h2>
                     <p className="text-muted-foreground">Please log in to use the recharge service.</p>
                     <Button onClick={() => window.location.href = '/Auth/login'}>Go to Login</Button>
                 </div>
             </MainLayout>
         );
     }

    return (
        <MainLayout location="recharge">
            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
                <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-8"
                >
                {/* Header with gradient text */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Mobile Recharge
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                    Quick, secure mobile recharges for all major providers in just a few clicks.
                    </p>
                </div>

                {/* Main card with subtle shadow and border radius */}
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <SmartphoneIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        <CardTitle className="text-2xl">Recharge Details</CardTitle>
                    </div>
                    <CardDescription className="text-base ml-9">
                        Enter your mobile number and choose from available plans
                    </CardDescription>
                    </div>
                    
                    <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-7 p-6">
                        {/* Mobile Number Input with icon */}
                        <div className="space-y-3">
                        <Label htmlFor="mobileNumber" className="text-base font-medium">Mobile Number</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            <PhoneIcon className="h-5 w-5" />
                            </span>
                            <Input
                            id="mobileNumber"
                            type="tel"
                            className="pl-10 h-12 text-lg"
                            placeholder="Enter 10-digit mobile number"
                            value={mobileNumber}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                if (value.length <= 10) {
                                setMobileNumber(value);
                                setError(null);
                                setSuccessMessage(null);
                                }
                            }}
                            required
                            maxLength={10}
                            />
                        </div>
                        {mobileNumber.length === 10 && (
                            <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} 
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center text-sm text-green-600 dark:text-green-400"
                            >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Valid number format
                            </motion.div>
                        )}
                        </div>

                        {/* Provider grid for better visual selection */}
                        <div className="space-y-3">
                        <Label htmlFor="provider" className="text-base font-medium">Service Provider</Label>
                        <Select
                            value={selectedProvider}
                            onValueChange={handleProviderChange}
                            required
                            disabled={isLoadingProviders || !mobileNumber || mobileNumber.length !== 10}
                        >
                            <SelectTrigger id="provider" className="w-full h-12" disabled={isLoadingProviders}>
                            <SelectValue placeholder={isLoadingProviders ? "Loading providers..." : "Select Provider"} />
                            </SelectTrigger>
                            <SelectContent className="max-h-80">
                            {!isLoadingProviders && providers.length === 0 && (
                                <SelectItem value="no-providers" disabled>No providers available</SelectItem>
                            )}
                            {providers.map((provider) => (
                                <SelectItem key={provider.id} value={provider.id} className="py-2">
                                {provider.name}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        </div>

                        {/* Pack Selection with improved styling */}
                        <div className="space-y-3">
                        <Label htmlFor="pack" className="text-base font-medium">Recharge Pack / Plan</Label>
                        <Select
                            value={selectedPack}
                            onValueChange={handlePackChange}
                            required
                            disabled={isLoadingPacks || !selectedProvider || packs.length === 0}
                        >
                            <SelectTrigger id="pack" className="w-full h-12" disabled={isLoadingPacks || !selectedProvider}>
                            <SelectValue placeholder={
                                !selectedProvider ? "Select provider first" :
                                isLoadingPacks ? "Loading plans..." :
                                (packs.length === 0 && !isLoadingPacks) ? "No plans found" :
                                "Select Plan / Pack"
                            } />
                            </SelectTrigger>
                            <SelectContent className="max-h-80">
                            {(isLoadingPacks || (!selectedProvider && !isLoadingPacks)) && (
                                <SelectItem value="loading" disabled>
                                {isLoadingPacks ? "Loading..." : "Select provider first"}
                                </SelectItem>
                            )}
                            {!isLoadingPacks && selectedProvider && packs.length === 0 && (
                                <SelectItem value="no-plans" disabled>No plans found for this provider</SelectItem>
                            )}
                            {packs.map((pack) => (
                                <SelectItem key={pack.id} value={pack.id} className="py-3">
                                <div className="flex flex-col">
                                    <span className="font-medium">₹{pack.amount} - {pack.description}</span>
                                    {/* <span className="text-xs text-muted-foreground mt-1">Validity: {pack.validity || 'N/A'}</span> */}
                                </div>
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        </div>

                        {/* Amount Display with currency symbol */}
                        <div className="space-y-3">
                        <Label htmlFor="amount" className="text-base font-medium">Amount (INR)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                            <Input
                            id="amount"
                            type="number"
                            className="pl-8 h-12 text-lg font-medium"
                            placeholder="Amount"
                            value={amount}
                            readOnly
                            required
                            />
                        </div>
                        </div>

                        {/* Error/Success Messages with animation */}
                        {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Alert variant="destructive" className="border border-red-200 bg-red-50 dark:bg-red-950/30">
                            <XCircle className="h-5 w-5" />
                            <AlertTitle className="font-medium">Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        </motion.div>
                        )}

                        {successMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Alert className="border border-green-200 bg-green-50 dark:bg-green-950/30">
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            <AlertTitle className="font-medium text-green-600 dark:text-green-400">Success</AlertTitle>
                            <AlertDescription className="text-green-700 dark:text-green-300">{successMessage}</AlertDescription>
                            </Alert>
                        </motion.div>
                        )}
                    </CardContent>
                    
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 p-6">
                        <Button 
                        type="submit" 
                        className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all" 
                        disabled={isSubmitting || isLoadingProviders || isLoadingPacks || !amount}
                        >
                        {isSubmitting ? (
                            <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Processing...
                            </>
                        ) : (
                            <>Proceed to Recharge</>
                        )}
                        </Button>
                    </div>
                    </form>
                </Card>

                {/* Benefits section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md border border-gray-100 dark:border-gray-700">
                    <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 w-12 h-12 flex items-center justify-center mb-4">
                        <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Secure Payments</h3>
                    <p className="text-muted-foreground">All transactions are protected with industry-standard encryption.</p>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md border border-gray-100 dark:border-gray-700">
                    <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 w-12 h-12 flex items-center justify-center mb-4">
                        <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Instant Recharge</h3>
                    <p className="text-muted-foreground">Your mobile balance updates within seconds after payment.</p>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md border border-gray-100 dark:border-gray-700">
                    <div className="rounded-full bg-green-100 dark:bg-green-900/30 w-12 h-12 flex items-center justify-center mb-4">
                        <Gift className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Cashback Rewards</h3>
                    <p className="text-muted-foreground">Earn points on every recharge that can be redeemed later.</p>
                    </div>
                </div>
                </motion.div>
            </div>
        </MainLayout>
    );
};

export default RechargePage;
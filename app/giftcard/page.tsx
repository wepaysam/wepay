"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Gift, CheckCircle, XCircle, User, Mail, Phone, MessageSquare, DollarSign, Info, ShoppingCart ,FileText} from "lucide-react";
import MainLayout from "../components/MainLayout"; // Adjust path as needed
import { useGlobalContext } from "../context/GlobalContext"; // Adjust path as needed
import { Button } from "../components/ui/button";
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
import Image from "next/image"; // For displaying gift card images
import Link from "next/link";

// --- Interfaces based on your API responses ---
interface GiftCardProvider {
    provider: string; // Name of the gift card
    code: string;     // Code for API request
    sku: string;
    description: string;
    price_type: "RANGE" | "DENOMINATIONS"; // Or other types if they exist
    min_custom_price?: string; // String in API, convert to number
    max_custom_price?: string; // String in API, convert to number
    denominations?: string[] | null; // Array of fixed amounts (strings)
    product_type: string;
    terms: string;
    image: string; // URL
    icon: string;  // URL
}

interface PurchaseGiftCardRequest {
    code: string; // Provider code
    fname: string;
    lname: string;
    client_referenceId: string; // Generate this
    amount: string; // API expects string
    email: string;
    mobile: string;
    giftMessage: string;
}

interface PurchaseGiftCardResponseVoucher {
    cardprice: string;
    cardno: string;
    pin: string;
    cardexp: string;
    message: string;
}

interface PurchaseGiftCardResponse {
    status: "SUCCESS" | "FAILURE" | string; // Be flexible
    current_time: string;
    callback_status: string;
    amount: string;
    message: string;
    operator_ref?: string;
    voucher?: PurchaseGiftCardResponseVoucher;
    provider_name?: string;
    txstatus_desc?: string;
    order_id?: string;
    biller?: string;
    timestamp: string;
    tlid?: string;
}

// Sample data for providers based on your first API response
const sampleGiftCardProviders: GiftCardProvider[] = [
    { provider: "Himalaya e-Gift Voucher", code: "WBNA", sku: "GVGBHIS001", description: "The Himalaya Drug Company was established in the 1930s...", price_type: "RANGE", min_custom_price: "100", max_custom_price: "10000", denominations: null, product_type: "Digital", terms: "This EGC shall have a validity period of 1 year...", image: "https://giftbig.s3.amazonaws.com/microsite/product/GVGBHIS001/d/small_image/48_spayapi.png", icon: "https://giftbig.s3.amazonaws.com/microsite/product/GVGBHIS001/d/mobile/48_microsite.png" },
    { provider: "Peter England E-Gift Voucher", code: "WOMI", sku: "EGVGBPES001", description: "One can buy a richly-embroidered traditional sherwani here...", price_type: "RANGE", min_custom_price: "500", max_custom_price: "10000", denominations: null, product_type: "Digital", terms: "This EGC shall have a validity period of 6 months...", image: "https://giftbig.s3.amazonaws.com/microsite/product/EGVGBPES001/d/small_image/63_spayapi.jpg", icon: "https://giftbig.s3.amazonaws.com/microsite/product/EGVGBPES001/d/mobile/63_microsite.jpg" },
    { provider: "Fastrack E-Gift Card", code: "BOSN", sku: "EGVGBFTS001", description: "Fastrack is a cool, hip accessories brand...", price_type: "RANGE", min_custom_price: "250", max_custom_price: "10000", denominations: null, product_type: "Digital", terms: "Validity of the voucher is for a maximum period of 6 months...", image: "https://giftbig.s3.amazonaws.com/microsite/product/EGVGBFTS001/d/small_image/66_spayapi.jpg", icon: "https://giftbig.s3.amazonaws.com/microsite/product/EGVGBFTS001/d/mobile/66_microsite.jpg" },
    // Add more sample providers if needed
];


const GiftCardPage = () => {
    const { user, isLogged, loading: globalLoading, refreshUserData } = useGlobalContext();

    const [giftCardProviders, setGiftCardProviders] = useState<GiftCardProvider[]>([]);
    const [selectedProviderCode, setSelectedProviderCode] = useState<string>("");

    // Form states
    const [recipientFirstName, setRecipientFirstName] = useState("");
    const [recipientLastName, setRecipientLastName] = useState("");
    const [recipientEmail, setRecipientEmail] = useState("");
    const [recipientMobile, setRecipientMobile] = useState("");
    const [amount, setAmount] = useState<string>(""); // Stored as string
    const [giftMessage, setGiftMessage] = useState("Happy Gifting!");

    const [isLoadingProviders, setIsLoadingProviders] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [error, setError] = useState<string | null>(null);
    const [successDetails, setSuccessDetails] = useState<PurchaseGiftCardResponse | null>(null);

    const selectedProviderDetails = giftCardProviders.find(p => p.code === selectedProviderCode);

    // Fetch gift card providers
    useEffect(() => {
        const fetchProviders = async () => {
            setIsLoadingProviders(true);
            setError(null);
            try {
                // const response = await fetch('/api/giftcards/list', { // Your actual API endpoint
                //     method: 'POST', // If it's a POST
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify({ category: "giftcard" }) // If body is needed
                // });
                // if (!response.ok) {
                //     throw new Error('Failed to fetch gift card providers');
                // }
                // const result = await response.json();
                // if (result.status !== "Success" || !result.data) {
                //     throw new Error(result.message || 'Could not parse providers');
                // }
                // setGiftCardProviders(result.data);

                // Using sample data for now
                setGiftCardProviders(sampleGiftCardProviders);

            } catch (err: any) {
                setError(err.message || 'Could not load gift card providers.');
                console.error("Provider fetch error:", err);
            } finally {
                setIsLoadingProviders(false);
            }
        };

        if (isLogged) {
             fetchProviders();
        }
    }, [isLogged]);

    // Handle amount validation based on selected provider
    useEffect(() => {
        if (selectedProviderDetails && amount) {
            const numericAmount = parseFloat(amount);
            if (selectedProviderDetails.price_type === "RANGE") {
                const min = parseFloat(selectedProviderDetails.min_custom_price || "0");
                const max = parseFloat(selectedProviderDetails.max_custom_price || "Infinity");
                if (numericAmount < min || numericAmount > max) {
                    setError(`Amount must be between ₹${min} and ₹${max} for ${selectedProviderDetails.provider}.`);
                } else {
                    setError(null);
                }
            } else if (selectedProviderDetails.price_type === "DENOMINATIONS" && selectedProviderDetails.denominations) {
                if (!selectedProviderDetails.denominations.includes(amount)) {
                     setError(`Invalid amount for ${selectedProviderDetails.provider}. Choose from available denominations.`);
                } else {
                    setError(null);
                }
            }
        }
    }, [amount, selectedProviderDetails]);


    const handleProviderChange = (value: string) => {
        setSelectedProviderCode(value);
        setAmount(""); // Reset amount when provider changes
        setError(null);
        setSuccessDetails(null);
        // If price_type is DENOMINATIONS and there's only one, auto-select it
        const provider = giftCardProviders.find(p => p.code === value);
        if (provider?.price_type === "DENOMINATIONS" && provider.denominations?.length === 1) {
            setAmount(provider.denominations[0]);
        }

    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessDetails(null);

        if (!selectedProviderDetails) {
            setError("Please select a gift card provider.");
            return;
        }
        if (!recipientFirstName.trim() || !recipientLastName.trim()) {
            setError("Please enter recipient's full name.");
            return;
        }
        if (!recipientEmail.trim() || !/^\S+@\S+\.\S+$/.test(recipientEmail)) {
            setError("Please enter a valid recipient email address.");
            return;
        }
        if (!recipientMobile.trim() || !/^\d{10}$/.test(recipientMobile)) {
            setError("Please enter a valid 10-digit recipient mobile number.");
            return;
        }
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            setError("Please enter a valid amount.");
            return;
        }
        // Re-check amount constraints (already handled by useEffect, but good for direct submit)
        if (selectedProviderDetails.price_type === "RANGE") {
            const min = parseFloat(selectedProviderDetails.min_custom_price || "0");
            const max = parseFloat(selectedProviderDetails.max_custom_price || "Infinity");
            if (parseFloat(amount) < min || parseFloat(amount) > max) {
                setError(`Amount must be between ₹${min} and ₹${max}.`);
                return;
            }
        } else if (selectedProviderDetails.price_type === "DENOMINATIONS" && selectedProviderDetails.denominations) {
            if (!selectedProviderDetails.denominations.includes(amount)) {
                 setError(`Invalid amount. Choose from available denominations.`);
                 return;
            }
        }


        setIsSubmitting(true);

        try {
            const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
            if (!token) throw new Error("Authentication token not found. Please log in again.");

            const requestBody: PurchaseGiftCardRequest = {
                code: selectedProviderDetails.code,
                fname: recipientFirstName,
                lname: recipientLastName,
                client_referenceId: `APAY${Date.now()}${Math.floor(Math.random() * 1000)}`, // Generate unique ID
                amount: amount,
                email: recipientEmail,
                mobile: recipientMobile,
                giftMessage: giftMessage || "Enjoy your gift!",
            };

            // const response = await fetch('/api/giftcards/purchase', { // Your actual purchase API endpoint
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //         Authorization: `Bearer ${token}`,
            //     },
            //     body: JSON.stringify({ request: requestBody }), // API expects nested 'request'
            // });
            // const result: PurchaseGiftCardResponse = await response.json();

            // if (!response.ok || result.status?.toUpperCase() !== "SUCCESS") {
            //     throw new Error(result.message || `Purchase failed: ${result.txstatus_desc || 'Unknown error'}`);
            // }

            // --- Simulate API Success ---
            await new Promise(resolve => setTimeout(resolve, 1500));
            const result: PurchaseGiftCardResponse = {
                status: "SUCCESS", current_time: new Date().toISOString(), callback_status: "Success",
                amount: amount, message: "Gift Card Order Successful", operator_ref: "SIM12345",
                voucher: { cardprice: amount, cardno: "SIM6003736672740000", pin: `${Math.floor(100000 + Math.random() * 900000)}`, cardexp: "2026-01-18", message: "Gift Card Order Successful" },
                provider_name: selectedProviderDetails.provider, txstatus_desc: "Success", order_id: `SIM_ANBLU${Date.now()}`,
                biller: selectedProviderDetails.provider, timestamp: new Date().toISOString(), tlid: `APAY_SIM${Date.now()}`
            };
            // --- End Simulation ---

            setSuccessDetails(result);
            refreshUserData(); // Refresh balance

        } catch (err: any) {
            setError(err.message || "An unexpected error occurred while purchasing the gift card.");
            console.error("Gift card purchase error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

     if (globalLoading) { /* ... (same as recharge page) ... */ return <MainLayout location="giftcards"><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div></MainLayout>; }
     if (!isLogged && !globalLoading) { /* ... (same as recharge page) ... */ return <MainLayout location="giftcards"><div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center"><h2 className="text-xl font-semibold">Access Denied</h2><p className="text-muted-foreground">Please log in to purchase gift cards.</p><Button ><Link href={"/Auth/login"}>Go to Login</Link></Button></div></MainLayout>;}


    return (
        <MainLayout location="giftcards"> {/* Update location prop for MainLayout if it uses it */}
            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="space-y-8"
                >
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                            Purchase Gift Cards
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                            Send thoughtful digital gift cards instantly for any occasion. Choose from a wide variety of brands.
                        </p>
                    </div>

                    <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Gift className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                <CardTitle className="text-2xl">Gift Card Details</CardTitle>
                            </div>
                            <CardDescription className="text-base ml-9">
                                Select a brand, enter recipient details, and the amount.
                            </CardDescription>
                        </div>
                        
                        <form onSubmit={handleSubmit}>
                            <CardContent className="space-y-7 p-6">
                                {/* Gift Card Provider Selection */}
                                <div className="space-y-3">
                                    <Label htmlFor="giftCardProvider" className="text-base font-medium">Gift Card Brand</Label>
                                    <Select value={selectedProviderCode} onValueChange={handleProviderChange} required disabled={isLoadingProviders}>
                                        <SelectTrigger id="giftCardProvider" className="w-full h-12">
                                            <SelectValue placeholder={isLoadingProviders ? "Loading brands..." : "Select Brand"} />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-80">
                                            {!isLoadingProviders && giftCardProviders.length === 0 && <SelectItem value="no-providers" disabled>No brands available</SelectItem>}
                                            {giftCardProviders.map((p) => (
                                                <SelectItem key={p.code} value={p.code} className="py-2">
                                                    <div className="flex items-center gap-2">
                                                        <Image src={p.icon || p.image} alt={p.provider} width={24} height={24} className="rounded-sm" unoptimized/>
                                                        <span>{p.provider}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {selectedProviderDetails && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-xs text-muted-foreground p-2 bg-secondary/30 rounded-md">
                                            {selectedProviderDetails.description.substring(0, 150)}{selectedProviderDetails.description.length > 150 ? "..." : ""}
                                        </motion.div>
                                    )}
                                </div>

                                {/* Recipient Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                    <div className="space-y-2"> <Label htmlFor="recipientFirstName">Recipient First Name</Label> <Input id="recipientFirstName" value={recipientFirstName} onChange={e => setRecipientFirstName(e.target.value)} placeholder="John" required /> </div>
                                    <div className="space-y-2"> <Label htmlFor="recipientLastName">Recipient Last Name</Label> <Input id="recipientLastName" value={recipientLastName} onChange={e => setRecipientLastName(e.target.value)} placeholder="Doe" required /> </div>
                                    <div className="space-y-2"> <Label htmlFor="recipientEmail">Recipient Email</Label> <Input id="recipientEmail" type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="john.doe@example.com" required /> </div>
                                    <div className="space-y-2"> <Label htmlFor="recipientMobile">Recipient Mobile</Label> <Input id="recipientMobile" type="tel" value={recipientMobile} onChange={e => {const val = e.target.value.replace(/\D/g, ''); if(val.length <= 10) setRecipientMobile(val);}} placeholder="9876543210" required maxLength={10} /> </div>
                                </div>

                                {/* Amount Input */}
                                <div className="space-y-3">
                                    <Label htmlFor="amount" className="text-base font-medium">Amount (INR)</Label>
                                    {selectedProviderDetails?.price_type === "RANGE" ? (
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                                            <Input id="amount" type="number" className="pl-8 h-12 text-lg font-medium" placeholder={`Min ${selectedProviderDetails.min_custom_price}, Max ${selectedProviderDetails.max_custom_price}`} value={amount} onChange={e => setAmount(e.target.value)} required 
                                                min={selectedProviderDetails.min_custom_price}
                                                max={selectedProviderDetails.max_custom_price}
                                            />
                                        </div>
                                    ) : selectedProviderDetails?.price_type === "DENOMINATIONS" && selectedProviderDetails.denominations ? (
                                        <Select value={amount} onValueChange={setAmount} required disabled={!selectedProviderCode}>
                                            <SelectTrigger className="w-full h-12"><SelectValue placeholder="Select Denomination" /></SelectTrigger>
                                            <SelectContent>
                                                {selectedProviderDetails.denominations.map(denom => (
                                                    <SelectItem key={denom} value={denom}>₹{denom}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input id="amount" type="number" className="h-12 text-lg font-medium" placeholder="Select brand first" value={amount} readOnly disabled />
                                    )}
                                    {selectedProviderDetails && <p className="text-xs text-muted-foreground">
                                        {selectedProviderDetails.price_type === "RANGE" ? `Enter any amount between ₹${selectedProviderDetails.min_custom_price} and ₹${selectedProviderDetails.max_custom_price}.` : "Select from available denominations."}
                                    </p>}
                                </div>

                                {/* Gift Message */}
                                <div className="space-y-2">
                                    <Label htmlFor="giftMessage">Gift Message (Optional)</Label>
                                    <Input id="giftMessage" value={giftMessage} onChange={e => setGiftMessage(e.target.value)} placeholder="Happy Birthday!" />
                                </div>


                                {/* Error/Success Messages */}
                                {error && ( /* ... (same as recharge page) ... */ <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><Alert variant="destructive" className="border border-red-200 bg-red-50 dark:bg-red-950/30"><XCircle className="h-5 w-5" /><AlertTitle className="font-medium">Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></motion.div>)}
                                {successDetails && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <Alert className="border border-green-200 bg-green-50 dark:bg-green-950/30">
                                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                            <AlertTitle className="font-medium text-green-600 dark:text-green-400">Gift Card Purchased Successfully!</AlertTitle>
                                            <AlertDescription className="text-green-700 dark:text-green-300 space-y-1 mt-2">
                                                <p>{successDetails.message}</p>
                                                {successDetails.voucher && (
                                                    <>
                                                        <p><strong>Card No:</strong> {successDetails.voucher.cardno}</p>
                                                        <p><strong>PIN:</strong> {successDetails.voucher.pin}</p>
                                                        <p><strong>Expires:</strong> {new Date(successDetails.voucher.cardexp).toLocaleDateString()}</p>
                                                    </>
                                                )}
                                                <p>Details have also been sent to the recipient &epos; s email/mobile.</p>
                                            </AlertDescription>
                                        </Alert>
                                    </motion.div>
                                )}
                            </CardContent>
                            
                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-6">
                                <Button 
                                    type="submit" 
                                    className="w-full h-12 text-base font-medium bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 transition-all text-white" 
                                    disabled={isSubmitting || isLoadingProviders || !selectedProviderCode || !amount || !!error}
                                >
                                    {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing...</> : <><ShoppingCart className="mr-2 h-5 w-5" /> Purchase Gift Card</>}
                                </Button>
                            </div>
                        </form>
                    </Card>

                    {/* Info/Benefits Section (optional) */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                        <div className="bg-card p-5 rounded-lg shadow-sm border border-border">
                            <div className="rounded-full bg-primary/10 w-10 h-10 flex items-center justify-center mb-3">
                                <Info className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="font-semibold text-md mb-1">How it Works</h3>
                            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                                <li>Select your desired gift card brand.</li>
                                <li>Enter recipient details and choose the amount.</li>
                                <li>Add a personal message (optional).</li>
                                <li>Complete the payment.</li>
                                <li>The digital gift card is sent instantly!</li>
                            </ol>
                        </div>
                        {selectedProviderDetails?.terms && (
                             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card p-5 rounded-lg shadow-sm border border-border">
                                <div className="rounded-full bg-primary/10 w-10 h-10 flex items-center justify-center mb-3">
                                    <FileText className="h-5 w-5 text-primary" /> {/* Placeholder for FileText, import if needed */}
                                </div>
                                <h3 className="font-semibold text-md mb-1">{selectedProviderDetails.provider} - Terms & Conditions</h3>
                                <p className="text-xs text-muted-foreground max-h-32 overflow-y-auto">
                                    {selectedProviderDetails.terms}
                                </p>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
        </MainLayout>
    );
};

export default GiftCardPage;
"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { User, Mail, Phone, Lock, CheckCircle, CreditCard, FileText } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useToast } from "../../hooks/use-toast";

const aadhaarFieldSchema = z.string()
  .min(12, "Aadhaar number must be 12 digits")
  .max(12, "Aadhaar number must be 12 digits")
  .regex(/^\d+$/, "Aadhaar number must contain only digits");

const panFieldSchema = z.string()
  .min(10, "PAN card number must be 10 characters")
  .max(10, "PAN card number must be 10 characters")
  .regex(/^[A-Z0-9]+$/, "PAN card number must contain only uppercase letters and numbers");

const signupSchema = z.object({
  email: z.string().email("Please provide a valid email address").optional(),
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must not exceed 15 digits")
    .regex(/^\d+$/, "Phone number must contain only digits"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const Signup = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [mobileOtp, setMobileOtp] = useState("");
  const [showMobileOtpInput, setShowMobileOtpInput] = useState(false);
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [aadhaarOtp, setAadhaarOtp] = useState("");
  const [showAadhaarOtpInput, setShowAadhaarOtpInput] = useState(false);
  const [isAadhaarVerified, setIsAadhaarVerified] = useState(false);
  const [isPanVerified, setIsPanVerified] = useState(false);
  
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      name: "",
      phoneNumber: "",
      aadhaarNumber: "",
      panCardNumber: "",
    },
  });

  useEffect(() => {
    if (mobileOtp === "0000") {
      setIsMobileVerified(true);
      setShowMobileOtpInput(false);
      toast({
        title: "Success",
        description: "Mobile number verified!",
        variant: "default",
      });
    }
  }, [mobileOtp, toast]);

  useEffect(() => {
    if (aadhaarOtp === "0000") {
      setIsAadhaarVerified(true);
      setShowAadhaarOtpInput(false);
      toast({
        title: "Success",
        description: "Aadhaar verified successfully!",
        variant: "default",
      });
    }
  }, [aadhaarOtp, toast]);

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true); // Set loading at the beginning

    if (currentStep === 1) {
      if (isMobileVerified) {
        setCurrentStep(2);
        setIsLoading(false); // Reset loading as we are just changing step
      } else {
        toast({
          title: "Verification Required",
          description: "Please verify your mobile number before proceeding.",
          variant: "destructive",
        });
        setIsLoading(false); // Reset loading
      }
      return; // Prevent further execution for Step 1
    }

    // The following code will only execute if currentStep is not 1
    // (e.g., when currentStep is 2 and the form is submitted for account creation)
    if (currentStep === 2) {
      // Validate KYC verification status
      if (!isAadhaarVerified) {
        toast({ title: "Aadhaar Not Verified", description: "Please verify your Aadhaar number.", variant: "destructive" });
        setIsLoading(false); return;
      }
      if (!isPanVerified) {
        toast({ title: "PAN Not Verified", description: "Please verify your PAN card number.", variant: "destructive" });
        setIsLoading(false); return;
      }

      // Validate Aadhaar Number format from form data
      // Assuming data.aadhaarNumber is available as it's a registered FormField with defaultValues
      const parsedAadhaar = aadhaarFieldSchema.safeParse((data as any).aadhaarNumber);
      if (!parsedAadhaar.success) {
        toast({ title: "Invalid Aadhaar Number", description: parsedAadhaar.error.errors[0]?.message || "Invalid format.", variant: "destructive" });
        setIsLoading(false); return;
      }

      // Validate PAN Card Number format from form data
      // Assuming data.panCardNumber is available
      const parsedPan = panFieldSchema.safeParse((data as any).panCardNumber);
      if (!parsedPan.success) {
        toast({ title: "Invalid PAN Card Number", description: parsedPan.error.errors[0]?.message || "Invalid format.", variant: "destructive" });
        setIsLoading(false); return;
      }
    }
    
    // Re-check mobile verification before final submission (this check is good to keep)
    if (!isMobileVerified) {
      toast({
        title: "Mobile Verification Required",
        description: "Your mobile number is not verified.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // First check if a user with this phone number already exists
      const checkResponse = await fetch(`/api/auth/check-user?phoneNumber=${data.phoneNumber}`, {
        method: 'GET',
      });
      
      const checkResult = await checkResponse.json();
      
      if (checkResult.exists) {
        throw new Error('A user with this phone number already exists');
      }
      
      // Then register the user
      // Document upload related code is removed as per instructions.
      // aadhaarCardUrl and panCardUrl are no longer included.
      const userData = {
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber,
        aadhaarNumber: (data as any).aadhaarNumber, 
        panCardNumber: (data as any).panCardNumber,
        // aadhaarCardUrl: "", // Removed
        // panCardUrl: "",    // Removed
      };
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }
      
      toast({
        title: "Registration successful",
        description: "Your account has been created.",
      });
      
      // Store token in cookie
      if (typeof document !== 'undefined') {
        document.cookie = `token=${result.token}; path=/; max-age=31536000`;
      }
      
      // Navigate to dashboard
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center px-4 py-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8"
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-sm text-gray-300">
            Enter your details to create your account.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {currentStep === 1 && (
            <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Full Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        placeholder="Enter your full name"
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-primary focus:ring-primary"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Phone Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        placeholder="Enter your phone number"
                        maxLength={10}
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-primary focus:ring-primary"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center space-x-2">
              <Button 
                type="button" 
                onClick={() => {
                  setShowMobileOtpInput(true);
                  setIsMobileVerified(false);
                  setMobileOtp("");
                }} 
                className={`w-full mt-2 py-3 rounded-lg transition-colors ${isMobileVerified ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"} text-white`}
                disabled={isMobileVerified}
              >
                {isMobileVerified ? "✓ Verified" : "Verify Number"}
              </Button>
              {isMobileVerified && <CheckCircle className="h-6 w-6 text-green-500 mt-2" />}
            </div>

            {showMobileOtpInput && !isMobileVerified && (
              <div className="mt-4 space-y-2">
                <Input
                  type="text"
                  value={mobileOtp}
                  onChange={(e) => setMobileOtp(e.target.value)}
                  placeholder="Enter 4-digit OTP"
                  maxLength={4}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-primary focus:ring-primary"
                />
                <p className="text-xs text-gray-400">Enter  0000 for testing.</p>
              </div>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Email (Optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        placeholder="Your email address (optional)"
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-primary focus:ring-primary"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary-700 text-white py-3 rounded-lg transition-colors"
              disabled={currentStep === 1 ? (isLoading || !isMobileVerified) : (isLoading || !isAadhaarVerified || !isPanVerified)}
            >
              {isLoading ? (currentStep === 1 ? "Processing..." : "Submitting...") : (currentStep === 1 ? "Next" : "Submit")}
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-300">
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline focus:outline-none"
                  onClick={() => router.push("/Auth/login")}
                >
                  Log in
                </button>
              </p>
            </div>
            </>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white text-center">KYC Verification</h3>
                
                <FormField
                  control={form.control}
                  name="aadhaarNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Aadhaar Number</FormLabel>
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <div className="relative w-full">
                            <CreditCard className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <Input
                              placeholder="Enter 12-digit Aadhaar number"
                              className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-primary focus:ring-primary"
                              maxLength={12}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormControl>
                          <div className="relative w-full">
                            <CreditCard className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <Input
                              placeholder="Enter 12-digit Aadhaar number"
                              className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-primary focus:ring-primary"
                              maxLength={12}
                              {...field}
                              disabled={isAadhaarVerified || showAadhaarOtpInput}
                            />
                          </div>
                        </FormControl>
                        <Button 
                          type="button" 
                          onClick={() => {
                            setShowAadhaarOtpInput(true);
                            setIsAadhaarVerified(false);
                            setAadhaarOtp("");
                          }} 
                          className={`py-3 px-4 rounded-lg transition-colors whitespace-nowrap ${isAadhaarVerified ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"} text-white`}
                          disabled={isAadhaarVerified}
                        >
                          {isAadhaarVerified ? "✓ Verified" : "Verify"}
                        </Button>
                        {isAadhaarVerified && <CheckCircle className="h-6 w-6 text-green-500" />}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showAadhaarOtpInput && !isAadhaarVerified && (
                  <div className="mt-2 space-y-2 pl-2 pr-2">
                    <Input
                      type="text"
                      value={aadhaarOtp}
                      onChange={(e) => setAadhaarOtp(e.target.value)}
                      placeholder="Enter 4-digit OTP for Aadhaar"
                      maxLength={4}
                      className="bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-primary focus:ring-primary"
                    />
                    <p className="text-xs text-gray-400">Enter 0000 for testing.</p>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="panCardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">PAN Card Number</FormLabel>
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <div className="relative w-full">
                            <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <Input
                              placeholder="Enter 10-character PAN number"
                              className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-primary focus:ring-primary"
                              maxLength={10}
                              {...field}
                              onChange={(e) => {
                                e.target.value = e.target.value.toUpperCase();
                                field.onChange(e);
                              }}
                              disabled={isPanVerified}
                            />
                          </div>
                        </FormControl>
                        <Button 
                          type="button" 
                          onClick={() => {
                            setIsPanVerified(true);
                            toast({
                              title: "Success",
                              description: "PAN card verified successfully!",
                              variant: "default",
                            });
                          }} 
                          className={`py-3 px-4 rounded-lg transition-colors whitespace-nowrap ${isPanVerified ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"} text-white`}
                          disabled={isPanVerified}
                        >
                          {isPanVerified ? "✓ Verified" : "Verify"}
                        </Button>
                        {isPanVerified && <CheckCircle className="h-6 w-6 text-green-500" />}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FileUploadComponent
                  id="aadhaarFile"
                  label="Aadhaar Card Document"
                  file={aadhaarFile}
                  setFile={setAadhaarFile}
                  icon={<Upload className="h-5 w-5 text-gray-400 group-hover:text-primary" />} // This line will be removed by the JSX change
                /> 
                {/* PAN FileUploadComponent was here */}
              </div>
            )}
          </form>
        </Form>
      </motion.div>
    </div>
  );
};

export default Signup;
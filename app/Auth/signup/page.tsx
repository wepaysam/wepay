"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { User, Mail, Phone, CheckCircle, CreditCard, FileText } from "lucide-react"; // Removed Upload
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useToast } from "../../hooks/use-toast";
// import { uploadKycDocuments } from "../../utils/storage"; // Removed as document upload is removed

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
  // aadhaarNumber and panCardNumber are handled by FormFields and defaultValues,
  // but not strictly part of this initial schema. Validation is done manually in onSubmit.
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
  // Removed aadhaarFile and panFile states
  const [aadhaarOtp, setAadhaarOtp] = useState("");
  const [showAadhaarOtpInput, setShowAadhaarOtpInput] = useState(false);
  const [isAadhaarVerified, setIsAadhaarVerified] = useState(false);
  const [isPanVerified, setIsPanVerified] = useState(false);
  const [isRequestSubmitted, setIsRequestSubmitted] = useState(false); // To track if request is sent

  const form = useForm<SignupFormValues & { aadhaarNumber?: string, panCardNumber?: string }>({ // Added types for RHF
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      name: "",
      phoneNumber: "",
      aadhaarNumber: "",
      panCardNumber: "",
    },
  });

  // FileUploadComponent removed

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

  const onSubmit = async (data: SignupFormValues & { aadhaarNumber?: string, panCardNumber?: string }) => {
    setIsLoading(true);

    if (currentStep === 1) {
      if (isMobileVerified) {
        setCurrentStep(2);
        setIsLoading(false); 
      } else {
        toast({
          title: "Verification Required",
          description: "Please verify your mobile number before proceeding.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
      return; 
    }

    if (currentStep === 2) {
      if (!isAadhaarVerified) {
        toast({ title: "Aadhaar Not Verified", description: "Please verify your Aadhaar number.", variant: "destructive" });
        setIsLoading(false); return;
      }
      if (!isPanVerified) {
        toast({ title: "PAN Not Verified", description: "Please verify your PAN card number.", variant: "destructive" });
        setIsLoading(false); return;
      }

      // Validate Aadhaar Number format from form data
      const parsedAadhaar = aadhaarFieldSchema.safeParse(data.aadhaarNumber);
      if (!parsedAadhaar.success) {
        toast({ title: "Invalid Aadhaar Number", description: parsedAadhaar.error.errors[0]?.message || "Invalid format.", variant: "destructive" });
        setIsLoading(false); return;
      }

      // Validate PAN Card Number format from form data
      const parsedPan = panFieldSchema.safeParse(data.panCardNumber);
      if (!parsedPan.success) {
        toast({ title: "Invalid PAN Card Number", description: parsedPan.error.errors[0]?.message || "Invalid format.", variant: "destructive" });
        setIsLoading(false); return;
      }
    }
    
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
      const checkResponse = await fetch(`/api/auth/check-user?phoneNumber=${data.phoneNumber}`, {
        method: 'GET',
      });
      
      const checkResult = await checkResponse.json();
      
      if (checkResult.exists) {
        throw new Error('A user with this phone number already exists');
      }

      // Document upload logic removed
      
      const userData = {
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber,
        aadhaarNumber: data.aadhaarNumber, 
        panCardNumber: data.panCardNumber,
        // aadhaarCardUrl and panCardUrl removed
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
        title: "Account Request Sent",
        description: "Your account request has been sent and will be approved after admin approval.",
        variant: "default",
      });
      setIsRequestSubmitted(true); // Mark request as submitted
      
      // Token storage and navigation removed
      // if (typeof document !== 'undefined') {
      //   document.cookie = `token=${result.token}; path=/; max-age=31536000`;
      // }
      // setTimeout(() => router.push("/dashboard"), 1500);

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
            {currentStep === 1 ? "Enter your details to create your account." : "Complete KYC Verification."}
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
                <p className="text-xs text-gray-400">Enter 0000 for testing.</p>
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
              disabled={isLoading || !isMobileVerified}
            >
              {isLoading ? "Processing..." : "Next"}
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
                              disabled={isAadhaarVerified || showAadhaarOtpInput || isRequestSubmitted}
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
                          disabled={isAadhaarVerified || isRequestSubmitted}
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
                      disabled={isRequestSubmitted}
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
                              disabled={isPanVerified || isRequestSubmitted}
                            />
                          </div>
                        </FormControl>
                        <Button 
                          type="button" 
                          onClick={() => {
                            // Basic PAN format check could be added here before setting verified
                            // For now, direct verification as in original code
                            const panValue = form.getValues("panCardNumber");
                            const parsedPan = panFieldSchema.safeParse(panValue);
                            if(parsedPan.success){
                                setIsPanVerified(true);
                                toast({
                                  title: "Success",
                                  description: "PAN card verified successfully!", // Mock verification
                                  variant: "default",
                                });
                            } else {
                                toast({
                                  title: "Invalid PAN",
                                  description: parsedPan.error.errors[0]?.message || "Invalid PAN card format.",
                                  variant: "destructive",
                                });
                            }
                          }} 
                          className={`py-3 px-4 rounded-lg transition-colors whitespace-nowrap ${isPanVerified ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"} text-white`}
                          disabled={isPanVerified || isRequestSubmitted}
                        >
                          {isPanVerified ? "✓ Verified" : "Verify"}
                        </Button>
                        {isPanVerified && <CheckCircle className="h-6 w-6 text-green-500" />}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Document upload components removed */}
                
                {!isRequestSubmitted ? (
                  <>
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary-700 text-white py-3 rounded-lg transition-colors mt-4"
                      disabled={isLoading || !isAadhaarVerified || !isPanVerified || isRequestSubmitted}
                    >
                      {isLoading ? "Submitting Request..." : "Submit Account Request"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="w-full bg-gray-700 hover:bg-gray-800 text-white py-3 rounded-lg transition-colors"
                      disabled={isLoading || isRequestSubmitted}
                    >
                      Back
                    </Button>
                  </>
                ) : (
                  <div className="text-center text-green-400 mt-6 p-4 border border-green-500 rounded-md bg-green-900/30">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-semibold">Account Request Submitted!</p>
                    <p className="text-sm">Your request will be reviewed by an admin.</p>
                  </div>
                )}

              </div>
            )}
          </form>
        </Form>
      </motion.div>
    </div>
  );
};

export default Signup;
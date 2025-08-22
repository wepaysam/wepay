"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Phone } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import AnimatedCard from "../../components/AnimatedCard";
import { useToast } from "../../hooks/use-toast";
import { useGlobalContext } from "../../context/GlobalContext";
import GalaxyBackground from "../../components/GalaxyBackground";

// Schema definitions and type declarations...
// (same as your original code)
const requestOtpSchema = z.object({
  phoneNumber: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must not exceed 15 digits")
    .regex(/^\d+$/, "Phone number must contain only digits"),
});

const verifyOtpSchema = z.object({
  otp: z.string().min(6, "OTP must be 6 digits").max(6, "OTP must be 6 digits"),
});

type RequestOtpFormValues = z.infer<typeof requestOtpSchema>;
type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;

const Login = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { setUser, setIsLogged } = useGlobalContext();
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Form setup and handlers...
  // (same as your original code)
  const requestOtpForm = useForm<RequestOtpFormValues>({
    resolver: zodResolver(requestOtpSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

  const verifyOtpForm = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      otp: "",
    },
  });

  // Handlers (onRequestOtp, onVerifyOtp, etc.)
  // (same as your original code)
  const onRequestOtp = async (data: RequestOtpFormValues) => {
    setIsLoading(true);
    
    try {
      // First check if the user exists and their verification status
      const statusResponse = await fetch(`/api/auth/check-status?phoneNumber=${data.phoneNumber}`, {
        method: 'GET',
      });
      
      const statusResult = await statusResponse.json();
      
      if (!statusResult.exists) {
        toast({
          title: "Account not found",
          description: "No account has been created with this phone number. Please sign up first.",
          variant: "destructive",
        });
        
        setTimeout(() => router.push("/Auth/signup"), 2000);
        return;
      }
      
      if (statusResult.status === 'UNVERIFIED') {
        toast({
          title: "Account pending verification",
          description: "Your account is waiting for verification by an admin. Please try again later.",
          variant: "destructive",
        });
        return;
      }
      
      if (statusResult.status === 'VERIFIED' || statusResult.status === 'ADMIN') {
        setUserPhone(data.phoneNumber);
        
        toast({
          title: "OTP Sent",
          description: `We've sent a verification code to ${data.phoneNumber}`,
        });
        
        verifyOtpForm.reset({ otp: "" });
        setOtpValues(['', '', '', '', '', '']);
        
        setOtpSent(true);
      }
    } catch (error: any) {
      toast({
        title: "Failed to send OTP",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyOtp = async (data: VerifyOtpFormValues) => {
    // Implementation same as your original code
    setIsLoading(true);
    
    try {
      const otpValue = otpValues.join('');
      
      if (otpValue !== "161616") {
        throw new Error("Invalid OTP. Please try again.");
      }
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: userPhone,
          password: "temporary-password"
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Login failed');
      }

      console.log("Login response:", result);
      
      toast({
        title: "Login successful",
        description: "Welcome back to WePay!",
      });

      if (typeof window !== 'undefined') {
        document.cookie = `token=${result.token}; path=/; max-age=31536000`;
        console.log("Token set with document.cookie:", result.token);
      }
      
      setUser(result.user);
      setIsLogged(true);
      
      console.log("User type:", result.user.userType);
      
      if (result.user.userType === 'ADMIN') {
        console.log("Redirecting to admin dashboard");
        window.location.href = '/admin';
      } else {
        console.log("Redirecting to user dashboard");
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // OTP handlers
  const handleOtpChange = (index: number, value: string) => {
    // Implementation same as your original code
    if (value && !/^\d*$/.test(value)) {
      return;
    }
    
    const newOtpValues = [...otpValues];
    newOtpValues[index] = value;
    setOtpValues(newOtpValues);
    
    verifyOtpForm.setValue('otp', newOtpValues.join(''));
    
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    }
  };
  
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    // Implementation same as your original code
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    
    if (!/^\d+$/.test(pastedData) || pastedData.length > 6) {
      return;
    }
    
    const newOtpValues = [...otpValues];
    for (let i = 0; i < Math.min(6, pastedData.length); i++) {
      newOtpValues[i] = pastedData[i];
    }
    
    setOtpValues(newOtpValues);
    verifyOtpForm.setValue('otp', newOtpValues.join(''));
  };
  
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Implementation same as your original code
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-8">
      {/* Galaxy Background */}
      <GalaxyBackground />
      
      {/* Card with login form */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="z-10"
      >
        <AnimatedCard className="w-full max-w-md p-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center">
              <motion.h1 
                className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                WePay Login
              </motion.h1>
              <p className="text-sm text-gray-300 mt-2">
                {otpSent 
                  ? "Enter the verification code sent to your phone" 
                  : "Enter your phone number to receive a verification code"}
              </p>
            </div>

            {!otpSent ? (
              // Step 1: Request OTP form
              <Form {...requestOtpForm}>
                <form onSubmit={requestOtpForm.handleSubmit(onRequestOtp)} className="space-y-4">
                  <FormField
                    control={requestOtpForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-200">Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              type="tel"
                              placeholder="Enter your phone number"
                              className="pl-10 bg-black/50 border-white/20 text-white"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Sending code..." : "Send Verification Code"}
                    </Button>
                  </motion.div>
                </form>
              </Form>
            ) : (
              // Step 2: Verify OTP form
              <Form {...verifyOtpForm}>
                <form onSubmit={verifyOtpForm.handleSubmit(onVerifyOtp)} className="space-y-4">
                  <div className="space-y-2">
                    <FormLabel className="text-gray-200">Verification Code</FormLabel>
                    <div className="flex justify-between gap-2">
                      {otpValues.map((value, index) => (
                        <Input
                          key={index}
                          id={`otp-input-${index}`}
                          type="text"
                          maxLength={1}
                          className="w-12 h-12 text-center text-lg font-medium bg-black/50 border-white/20 text-white"
                          value={value}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          onPaste={index === 0 ? handleOtpPaste : undefined}
                          autoComplete="off"
                          inputMode="numeric"
                        />
                      ))}
                    </div>
                    {verifyOtpForm.formState.errors.otp && (
                      <p className="text-sm font-medium text-red-400">
                        {verifyOtpForm.formState.errors.otp.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white" 
                        disabled={isLoading}
                      >
                        {isLoading ? "Verifying..." : "Verify & Login"}
                      </Button>
                    </motion.div>
                    
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="text-sm text-gray-300 hover:text-white"
                      onClick={() => setOtpSent(false)}
                      disabled={isLoading}
                    >
                      Use different number
                    </Button>
                  </div>
                  
                  {/* <div className="text-center text-sm text-gray-400">
                    <p>For testing, use code: <span className="font-medium text-purple-400">000000</span></p>
                  </div> */}
                </form>
              </Form>
            )}

            <div className="text-center">
              <p className="text-sm text-gray-400">
                Don&apos;t have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-purple-400 hover:text-purple-300"
                  onClick={() => router.push("/Auth/signup")}
                >
                  Sign up
                </Button>
              </p>
            </div>
          </motion.div>
        </AnimatedCard>
      </motion.div>
    </div>
  );
};

export default Login;
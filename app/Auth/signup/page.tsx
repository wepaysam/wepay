"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { User, Mail, Phone, Lock, Upload, CheckCircle, CreditCard, FileText } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useToast } from "../../hooks/use-toast";
import { uploadKycDocuments } from "../../utils/storage";

const signupSchema = z.object({
  email: z.string().email("Please provide a valid email address").optional(),
  phoneNumber: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must not exceed 15 digits")
    .regex(/^\d+$/, "Phone number must contain only digits"),
  aadhaarNumber: z.string()
    .min(12, "Aadhaar number must be 12 digits")
    .max(12, "Aadhaar number must be 12 digits")
    .regex(/^\d+$/, "Aadhaar number must contain only digits"),
  panCardNumber: z.string()
    .min(10, "PAN card number must be 10 characters")
    .max(10, "PAN card number must be 10 characters")
    .regex(/^[A-Z0-9]+$/, "PAN card number must contain only uppercase letters and numbers"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const Signup = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      phoneNumber: "",
      aadhaarNumber: "",
      panCardNumber: "",
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    if (!aadhaarFile || !panFile) {
      toast({
        title: "Missing documents",
        description: "Please upload both Aadhaar and PAN card documents",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // First check if a user with this phone number already exists
      const checkResponse = await fetch(`/api/auth/check-user?phoneNumber=${data.phoneNumber}`, {
        method: 'GET',
      });
      
      const checkResult = await checkResponse.json();
      
      if (checkResult.exists) {
        throw new Error('A user with this phone number already exists');
      }
      
      // Only proceed with uploading if the phone number is unique
      toast({
        title: "Uploading documents",
        description: "Please wait while we upload your KYC documents...",
      });
      
      // Upload files to Firebase Storage
      const { aadhaarCardUrl, panCardUrl } = await uploadKycDocuments(
        aadhaarFile,
        panFile,
        data.phoneNumber
      );
      
      // Then register the user with the file URLs
      const userData = {
        ...data,
        aadhaarCardUrl,
        panCardUrl,
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
        description: "Your account has been created and is pending KYC verification.",
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

  const FileUploadComponent = ({ 
    id, 
    label, 
    file, 
    setFile,
    icon
  }: { 
    id: string, 
    label: string, 
    file: File | null, 
    setFile: (file: File | null) => void,
    icon: React.ReactNode
  }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      setFile(selectedFile || null);
    };

    return (
      <div className="space-y-2">
        <label htmlFor={id} className="block text-sm font-medium text-white">
          {label}
        </label>
        <div className="relative">
          <input
            type="file"
            id={id}
            name={id}
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png"
          />
          <label 
            htmlFor={id} 
            className="flex items-center justify-between w-full px-4 py-3 text-sm 
              border border-dashed border-gray-300 rounded-lg cursor-pointer 
              hover:border-primary transition-colors group"
          >
            <div className="flex items-center space-x-2">
              {icon}
              <span className="text-gray-500 group-hover:text-primary">
                {file ? file.name : `Upload ${label}`}
              </span>
            </div>
            {file && <CheckCircle className="h-5 w-5 text-green-500" />}
          </label>
        </div>
      </div>
    );
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
            Enter your details and upload documents for KYC verification
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

            <div className="space-y-4 border border-white/20 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white">KYC Verification</h3>
              
              <FormField
                control={form.control}
                name="aadhaarNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Aadhaar Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          placeholder="Enter 12-digit Aadhaar number"
                          className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-primary focus:ring-primary"
                          maxLength={12}
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
                name="panCardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">PAN Card Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          placeholder="Enter 10-character PAN number"
                          className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-primary focus:ring-primary"
                          maxLength={10}
                          {...field}
                          onChange={(e) => {
                            // Convert input to uppercase
                            e.target.value = e.target.value.toUpperCase();
                            field.onChange(e);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 mt-4">
                <FileUploadComponent
                  id="aadhaarFile"
                  label="Aadhaar Card Document"
                  file={aadhaarFile}
                  setFile={setAadhaarFile}
                  icon={<Upload className="h-5 w-5 text-gray-400 group-hover:text-primary" />}
                />

                <FileUploadComponent
                  id="panFile"
                  label="PAN Card Document"
                  file={panFile}
                  setFile={setPanFile}
                  icon={<Upload className="h-5 w-5 text-gray-400 group-hover:text-primary" />}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary-700 text-white py-3 rounded-lg transition-colors"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create Account"}
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
          </form>
        </Form>
      </motion.div>
    </div>
  );
};

export default Signup;
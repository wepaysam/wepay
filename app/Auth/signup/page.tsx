"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { User, Mail, Phone, CheckCircle, CreditCard, FileText, Building, PlusCircle, XCircle } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useToast } from "../../hooks/use-toast";
import FileUpload from "../../components/FileUpload";
import { uploadFile } from "../../utils/storage";

// Schemas for validation
const aadhaarFieldSchema = z.string().length(12, "Aadhaar must be 12 digits").regex(/^\d+$/, "Aadhaar must contain only digits");
const panFieldSchema = z.string().length(10, "PAN must be 10 characters").regex(/^[A-Z0-9]+$/, "PAN must be uppercase letters and numbers");
const gstFieldSchema = z.string().length(15, "GST must be 15 characters").regex(/^[A-Z0-9]+$/, "GST must be uppercase letters and numbers");

const signupSchema = z.object({
  accountType: z.enum(['PROPRIETOR', 'COMPANY']),
  email: z.string().email("Invalid email address").optional(),
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  gstNumber: gstFieldSchema.optional(),
  
  // Company fields
  companyName: z.string().optional(),
  companyCIN: z.string().optional(),
  directors: z.array(z.object({
    name: z.string().min(1, "Director name is required"),
    pan: panFieldSchema,
    aadhaar: aadhaarFieldSchema,
  })).optional(),

}).superRefine((data, ctx) => {
  if (data.accountType === 'COMPANY') {
    if (!data.companyName || data.companyName.length < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Company name is required", path: ["companyName"] });
    }
    if (!data.companyCIN || data.companyCIN.length < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Company CIN is required", path: ["companyCIN"] });
    }
    if (!data.directors || data.directors.length < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least one director is required", path: ["directors"] });
    }
  }
});

type SignupFormValues = z.infer<typeof signupSchema>;

const Signup = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0: Type selection, 1: Details, 2: KYC
  
  // Common state
  const [mobileOtp, setMobileOtp] = useState("");
  const [showMobileOtpInput, setShowMobileOtpInput] = useState(false);
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [isRequestSubmitted, setIsRequestSubmitted] = useState(false);

  // Proprietor state
  const [aadhaarOtp, setAadhaarOtp] = useState("");
  const [showAadhaarOtpInput, setShowAadhaarOtpInput] = useState(false);
  const [isAadhaarVerified, setIsAadhaarVerified] = useState(false);
  const [isPanVerified, setIsPanVerified] = useState(false);
  const [officePhotos, setOfficePhotos] = useState<string[]>([]);
  
  const [aadhaarCardUrl, setAadhaarCardUrl] = useState<string | null>(null);
  const [panCardUrl, setPanCardUrl] = useState<string | null>(null);
  const [gstCertificateUrl, setGstCertificateUrl] = useState<string | null>(null);

  // Company state
  const [certificateOfIncorporationUrl, setCertificateOfIncorporationUrl] = useState<string | null>(null);
  const [moaUrl, setMoaUrl] = useState<string | null>(null);
  const [aoaUrl, setAoaUrl] = useState<string | null>(null);
  const [bankStatementUrl, setBankStatementUrl] = useState<string | null>(null);
  const [cancelledChequeUrl, setCancelledChequeUrl] = useState<string | null>(null);


  const form = useForm<SignupFormValues & { aadhaarNumber?: string, panCardNumber?: string }>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      accountType: 'PROPRIETOR',
      email: "",
      name: "",
      phoneNumber: "",
      aadhaarNumber: "",
      panCardNumber: "",
      gstNumber: "",
      companyName: "",
      companyCIN: "",
      directors: [{ name: "", pan: "", aadhaar: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "directors",
  });

  const accountType = form.watch("accountType");

  // Mock OTP verification effects
  useEffect(() => {
    if (mobileOtp === "0000") {
      setIsMobileVerified(true);
      setShowMobileOtpInput(false);
      toast({ title: "Success", description: "Mobile number verified!" });
    }
  }, [mobileOtp, toast]);

  useEffect(() => {
    if (aadhaarOtp === "0000") {
      setIsAadhaarVerified(true);
      setShowAadhaarOtpInput(false);
      toast({ title: "Success", description: "Aadhaar verified successfully!" });
    }
  }, [aadhaarOtp, toast]);

  const handleFileUpload = async (file: File, docType: "aadhaar" | "pan" | "office" | "gst" | "coi" | "moa" | "aoa" | "bankStatement" | "cancelledCheque") => {
    if (!file) return;
    setIsLoading(true);
    try {
      const phoneNumber = form.getValues("phoneNumber");
      if (!phoneNumber) {
        toast({ title: "Phone number required", description: "Please enter your phone number before uploading files.", variant: "destructive" });
        return;
      }
      const path = `kyc/${phoneNumber}/${docType}`;
      const url = await uploadFile(file, path);

      switch (docType) {
        case "aadhaar":
          setAadhaarCardUrl(url);
          break;
        case "pan":
          setPanCardUrl(url);
          break;
        case "office":
          setOfficePhotos(prev => [...prev, url]);
          break;
        case "gst":
          setGstCertificateUrl(url);
          break;
        case "coi":
          setCertificateOfIncorporationUrl(url);
          break;
        case "moa":
          setMoaUrl(url);
          break;
        case "aoa":
          setAoaUrl(url);
          break;
        case "bankStatement":
          setBankStatementUrl(url);
          break;
        case "cancelledCheque":
          setCancelledChequeUrl(url);
          break;
      }

      toast({ title: "Upload Successful", description: `${file.name} has been uploaded.` });
    } catch (error) {
      toast({ title: "Upload Failed", description: "Failed to upload file. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };


  const onSubmit = async (data: SignupFormValues & { aadhaarNumber?: string, panCardNumber?: string }) => {
    setIsLoading(true);

    // This validation is for step transitions, but we should also check on final submit.
    if (!isMobileVerified) {
        toast({ title: "Verification Required", description: "Please verify your mobile number.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    // Final KYC validation check on submission
    if (data.accountType === 'PROPRIETOR') {
        if (!isAadhaarVerified) {
            toast({ title: "Aadhaar Not Verified", description: "Please verify your Aadhaar number to proceed.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        if (!isPanVerified) {
            toast({ title: "PAN Not Verified", description: "Please verify your PAN card number to proceed.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
    }
    // Add company KYC validation here (e.g., ensure required docs are uploaded)
    if (data.accountType === 'COMPANY') {
        if (!certificateOfIncorporationUrl || !gstCertificateUrl || !moaUrl || !aoaUrl) {
             toast({ title: "Documents Required", description: "Please upload all required company documents.", variant: "destructive" });
             setIsLoading(false);
             return;
        }
    }

    try {
      // Final submission logic
      console.log("Attempting to check user existence...");
      const checkResponse = await fetch(`/api/auth/check-user?phoneNumber=${data.phoneNumber}`);
      const checkResult = await checkResponse.json();
      console.log("Check user existence result:", checkResult);
      if (checkResult.exists) {
        throw new Error('A user with this phone number already exists');
      }
      console.log("User does not exist, proceeding with registration...");

      const companyDocumentUrls = [];
      if (certificateOfIncorporationUrl) {
        companyDocumentUrls.push({ url: certificateOfIncorporationUrl, type: 'Certificate of Incorporation' });
      }
      if (gstCertificateUrl) {
        companyDocumentUrls.push({ url: gstCertificateUrl, type: 'GST Certificate' });
      }
      if (moaUrl) {
        companyDocumentUrls.push({ url: moaUrl, type: 'MOA' });
      }
      if (aoaUrl) {
        companyDocumentUrls.push({ url: aoaUrl, type: 'AOA' });
      }
      if (bankStatementUrl) {
        companyDocumentUrls.push({ url: bankStatementUrl, type: 'Bank Statement' });
      }
      if (cancelledChequeUrl) {
        companyDocumentUrls.push({ url: cancelledChequeUrl, type: 'Cancelled Cheque' });
      }

      // Construct payload based on account type
      const userData = {
        ...data,
        aadhaarCardUrl,
        panCardUrl,
        officePhotos,
        companyDocumentUrls,
      };
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }
      
      toast({
        title: "Account Request Sent",
        description: "Your request will be approved after admin review.",
      });
      setIsRequestSubmitted(true);

    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    const inputStyles = "py-2 px-3 bg-white border-gray-300 text-black placeholder-gray-500 focus:border-primary focus:ring-primary";
    const iconInputStyles = "pl-12 " + inputStyles;

    switch (currentStep) {
      case 0:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Select Account Type</h2>
            <div className="flex gap-4">
              <Button type="button" onClick={() => form.setValue('accountType', 'PROPRIETOR')} className={`flex-1 ${accountType === 'PROPRIETOR' ? 'bg-primary' : 'bg-gray-600'}`}>Proprietor</Button>
              <Button type="button" onClick={() => form.setValue('accountType', 'COMPANY')} className={`flex-1 ${accountType === 'COMPANY' ? 'bg-primary' : 'bg-gray-600'}`}>Company</Button>
            </div>
            <Button type="button" onClick={() => setCurrentStep(1)} className="w-full mt-6 bg-primary hover:bg-primary-700">Next</Button>
          </div>
        );
      case 1:
        return (
          <>
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel className="text-white">Full Name / Company Contact Person</FormLabel> <FormControl><div className="relative"><User className="absolute left-3  top-3 h-5 w-5 text-gray-400" /><Input placeholder="Enter name" className={iconInputStyles} {...field} /></div></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="phoneNumber" render={({ field }) => ( <FormItem> <FormLabel className="text-white">Phone Number</FormLabel> <FormControl><div className="relative"><Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" /><Input placeholder="Enter phone number" className={iconInputStyles} maxLength={10} {...field} /></div></FormControl> <FormMessage /> </FormItem> )}/>
            <div className="flex items-center space-x-2">
              <Button type="button" onClick={() => setShowMobileOtpInput(true)} className={`w-full mt-2 py-3 ${isMobileVerified ? "bg-green-600" : "bg-gray-600"}`} disabled={isMobileVerified}>{isMobileVerified ? "✓ Verified" : "Verify Number"}</Button>
              {isMobileVerified && <CheckCircle className="h-6 w-6 text-green-500 mt-2" />}
            </div>
            {showMobileOtpInput && !isMobileVerified && (
              <div className="mt-4 space-y-2">
                <Input type="text" value={mobileOtp} onChange={(e) => setMobileOtp(e.target.value)} placeholder="Enter 4-digit OTP" maxLength={4} className={inputStyles.replace("pl-12 ", "")} />
                <p className="text-xs text-gray-400">Enter 0000 for testing.</p>
              </div>
            )}
            <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel className="text-white">Email (Optional)</FormLabel> <FormControl><div className="relative"><Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" /><Input placeholder="Your email address" className={iconInputStyles} {...field} /></div></FormControl> <FormMessage /> </FormItem> )}/>
            <Button type="button" onClick={() => setCurrentStep(2)} className="w-full bg-primary" disabled={!isMobileVerified}>Next</Button>
            <Button type="button" onClick={() => { setCurrentStep(0); }} className="w-full bg-gray-700">Back</Button>
          </>
        );
      case 2:
        return (
          <>
            <h3 className="text-xl font-semibold text-white text-center">KYC Verification</h3>
            {accountType === 'PROPRIETOR' && (
              <div className="space-y-6">
                <FormField control={form.control} name="aadhaarNumber" render={({ field }) => ( <FormItem> <FormLabel className="text-white">Aadhaar Number</FormLabel> <div className="flex items-center space-x-2"><FormControl><div className="relative w-full"><CreditCard className="absolute left-3 top-3 h-5 w-5 text-gray-400" /><Input placeholder="12-digit Aadhaar" maxLength={12} className={iconInputStyles} {...field} disabled={isAadhaarVerified || showAadhaarOtpInput} /></div></FormControl><Button type="button" onClick={() => setShowAadhaarOtpInput(true)} className={`${isAadhaarVerified ? "bg-green-600" : "bg-gray-600"}`} disabled={isAadhaarVerified}>{isAadhaarVerified ? "✓ Verified" : "Verify"}</Button></div> <FormMessage /> </FormItem> )}/>
                {showAadhaarOtpInput && !isAadhaarVerified && (
                  <div className="mt-2 space-y-2"><Input type="text" value={aadhaarOtp} onChange={(e) => setAadhaarOtp(e.target.value)} placeholder="Enter 4-digit OTP" maxLength={4} className={inputStyles.replace("pl-12 ", "")} /><p className="text-xs text-gray-400">Enter 0000 for testing.</p></div>
                )}
                <FormField control={form.control} name="panCardNumber" render={({ field }) => ( <FormItem> <FormLabel className="text-white">PAN Card Number</FormLabel> <div className="flex items-center space-x-2"><FormControl><div className="relative w-full"><FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" /><Input placeholder="10-character PAN" maxLength={10} className={iconInputStyles} {...field} onChange={(e) => { e.target.value = e.target.value.toUpperCase(); field.onChange(e); }} disabled={isPanVerified} /></div></FormControl><Button type="button" onClick={() => { const parsedPan = panFieldSchema.safeParse(form.getValues("panCardNumber")); if(parsedPan.success){ setIsPanVerified(true); toast({ title: "Success", description: "PAN card verified!" }); } else { toast({ title: "Invalid PAN", description: parsedPan.error.errors[0]?.message, variant: "destructive" }); } }} className={`${isPanVerified ? "bg-green-600" : "bg-gray-600"}`} disabled={isPanVerified}>{isPanVerified ? "✓ Verified" : "Verify"}</Button></div> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="gstNumber" render={({ field }) => ( <FormItem> <FormLabel className="text-white">GST Number</FormLabel> <FormControl><div className="relative"><FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" /><Input placeholder="15-character GST" maxLength={15} className={iconInputStyles} {...field} /></div></FormControl> <FormMessage /> </FormItem> )}/>
                <h4 className="text-lg font-semibold text-white pt-4">Upload GST Certificate</h4>
                <FileUpload id="gst-certificate" onUpload={(file) => handleFileUpload(file, "gst")} label="Upload GST Certificate" />
                {gstCertificateUrl && <a href={gstCertificateUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">View GST Certificate</a>}
                <h4 className="text-lg font-semibold text-white pt-4">Upload Office Photos (4)</h4>
                <FileUpload id="office-photos" onUpload={(file) => handleFileUpload(file, "office")} multiple label="Upload Office Photos" />
                <div className="flex flex-wrap gap-2">
                  {officePhotos.map((url, i) => <img key={i} src={url} alt="Office Photo" className="w-20 h-20 object-cover rounded-md" />)}
                </div>
              </div>
            )}
            {accountType === 'COMPANY' && (
              <div className="space-y-6">
                <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem> <FormLabel className="text-white">Company Name</FormLabel> <FormControl><div className="relative"><Building className="absolute left-3 top-3 h-5 w-5 text-gray-400" /><Input placeholder="Enter company name" className={iconInputStyles} {...field} /></div></FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="companyCIN" render={({ field }) => ( <FormItem> <FormLabel className="text-white">Company CIN</FormLabel> <FormControl><div className="relative"><FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" /><Input placeholder="Enter CIN" className={iconInputStyles} {...field} /></div></FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="gstNumber" render={({ field }) => ( <FormItem> <FormLabel className="text-white">GST Number</FormLabel> <FormControl><div className="relative"><FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" /><Input placeholder="15-character GST" maxLength={15} className={iconInputStyles} {...field} /></div></FormControl> <FormMessage /> </FormItem> )}/>
                
                <h4 className="text-lg font-semibold text-white pt-4">Director Details</h4>
                {fields.map((item, index) => (
                  <div key={item.id} className="p-4 border border-white/20 rounded-lg space-y-4 relative">
                    {fields.length > 1 && <Button type="button" onClick={() => remove(index)} className="absolute -top-3 -right-3 h-7 w-7 p-0 rounded-full bg-red-600 hover:bg-red-700"><XCircle size={20}/></Button>}
                    <FormField control={form.control} name={`directors.${index}.name`} render={({ field }) => ( <FormItem> <FormLabel className="text-white">Director Name</FormLabel> <FormControl><Input placeholder="Full name" className={inputStyles.replace("pl-12 ", "")} {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name={`directors.${index}.pan`} render={({ field }) => ( <FormItem> <FormLabel className="text-white">Directors PAN</FormLabel> <FormControl><Input placeholder="10-character PAN" maxLength={10} className={inputStyles.replace("pl-12 ", "")} {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name={`directors.${index}.aadhaar`} render={({ field }) => ( <FormItem> <FormLabel className="text-white">Directors Aadhaar</FormLabel> <FormControl><Input placeholder="12-digit Aadhaar" maxLength={12} className={inputStyles.replace("pl-12 ", "")} {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                  </div>
                ))}
                <Button type="button" onClick={() => append({ name: "", pan: "", aadhaar: "" })} className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700"><PlusCircle size={16}/> Add Another Director</Button>

                <h4 className="text-lg font-semibold text-white pt-4">Upload Company Documents</h4>
                <FileUpload id="coi" onUpload={(file) => handleFileUpload(file, "coi")} label="Certificate of Incorporation" />
                {certificateOfIncorporationUrl && <a href={certificateOfIncorporationUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">View Certificate of Incorporation</a>}
                <FileUpload id="gst-certificate-company" onUpload={(file) => handleFileUpload(file, "gst")} label="Upload GST Certificate" />
                {gstCertificateUrl && <a href={gstCertificateUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">View GST Certificate</a>}
                <FileUpload id="moa" onUpload={(file) => handleFileUpload(file, "moa")} label="MOA" />
                {moaUrl && <a href={moaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">View MOA</a>}
                <FileUpload id="aoa" onUpload={(file) => handleFileUpload(file, "aoa")} label="AOA" />
                {aoaUrl && <a href={aoaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">View AOA</a>}
                <FileUpload id="bank-statement" onUpload={(file) => handleFileUpload(file, "bankStatement")} label="Bank Statement" />
                {bankStatementUrl && <a href={bankStatementUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">View Bank Statement</a>}
                <FileUpload id="cancelled-cheque" onUpload={(file) => handleFileUpload(file, "cancelledCheque")} label="Cancelled Cheque" />
                {cancelledChequeUrl && <a href={cancelledChequeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">View Cancelled Cheque</a>}

                <h4 className="text-lg font-semibold text-white pt-4">Upload Office Photos (4)</h4>
                <FileUpload id="office-photos-company" onUpload={(file) => handleFileUpload(file, "office")} multiple label="Upload Office Photos" />
                <div className="flex flex-wrap gap-2">
                  {officePhotos.map((url, i) => <img key={i} src={url} alt="Office Photo" className="w-20 h-20 object-cover rounded-md" />)}
                </div>
              </div>
            )}
            {!isRequestSubmitted ? (
              <>
                {/*  FIX IS HERE  */}
                <Button type="submit" className="w-full bg-primary mt-4" disabled={isLoading}>Submit Account Request</Button>
                <Button type="button" onClick={() => { setCurrentStep(1); }} className="w-full bg-gray-700 mt-2" disabled={isLoading}>Back</Button>
              </>
            ) : (
              <div className="text-center text-green-400 mt-6 p-4 border border-green-500 rounded-md">
                <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="font-semibold">Account Request Submitted!</p>
              </div>
            )}
          </>
        );
      default:
        return null;
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
            {currentStep === 0 && "First, tell us who you are."}
            {currentStep === 1 && "Next, enter your contact details."}
            {currentStep === 2 && `Complete KYC for your ${accountType.toLowerCase()} account.`}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {renderStep()}
          </form>
        </Form>
      </motion.div>
    </div>
  );
};

export default Signup;
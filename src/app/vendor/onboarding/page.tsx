"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  FileText, 
  MapPin, 
  CheckCircle2, 
  Loader2, 
  ArrowRight, 
  ArrowLeft,
  Store,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUploader } from "@/components/vendor/FileUploader";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";

const STEPS = [
  { id: "docs", title: "Documents", icon: FileText, description: "Upload business documents" },
  { id: "business", title: "Business", icon: Building2, description: "Verify business details" },
  { id: "bank", title: "Bank", icon: CreditCard, description: "Settlement account" },
  { id: "settings", title: "Store", icon: Store, description: "Delivery & settings" }
];

export default function VendorOnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    gstin: "",
    pan: "",
    storeAddress: "",
    bankAccount: {
      accountNumber: "",
      ifsc: "",
      beneficiaryName: ""
    },
    maxDeliveryRadius: 10,
    intercityEnabled: false,
    storePhotos: [] as string[],
    documents: {
      gstin: "",
      pan: "",
      cheque: ""
    }
  });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      submitOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const submitOnboarding = async () => {
    try {
      setIsSubmitting(true);
      await apiClient.post("/vendor/onboarding", formData);
      toast.success("Application submitted successfully!");
      router.push("/vendor/onboarding/pending");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit onboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>GSTIN Certificate (Optional if not registered)</Label>
                <FileUploader 
                  label="GSTIN PDF/JPG" 
                  onUpload={(url) => setFormData(prev => ({ ...prev, documents: { ...prev.documents, gstin: url } }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>PAN Card*</Label>
                <FileUploader 
                  label="PAN JPG" 
                  onUpload={(url) => setFormData(prev => ({ ...prev, documents: { ...prev.documents, pan: url } }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Cancelled Cheque / Passbook*</Label>
                <FileUploader 
                  label="Bank Proof JPG" 
                  onUpload={(url) => setFormData(prev => ({ ...prev, documents: { ...prev.documents, cheque: url } }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Store Photos* (Min 1)</Label>
                <FileUploader 
                  label="Store Front/Interior" 
                  onUpload={(url) => setFormData(prev => ({ ...prev, storePhotos: [...prev.storePhotos, url] }))} 
                />
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name*</Label>
              <Input 
                id="businessName" 
                value={formData.businessName} 
                onChange={e => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                placeholder="e.g. Artisan Gifts & Crafts"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN (Optional)</Label>
              <Input 
                id="gstin" 
                value={formData.gstin} 
                onChange={e => setFormData(prev => ({ ...prev, gstin: e.target.value }))}
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pan">PAN Number*</Label>
              <Input 
                id="pan" 
                value={formData.pan} 
                onChange={e => setFormData(prev => ({ ...prev, pan: e.target.value }))}
                placeholder="ABCDE1234F"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeAddress">Store Full Address*</Label>
              <Input 
                id="storeAddress" 
                value={formData.storeAddress} 
                onChange={e => setFormData(prev => ({ ...prev, storeAddress: e.target.value }))}
                placeholder="Street name, Landmark, City, State, Pincode"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accName">Beneficiary Name*</Label>
              <Input 
                id="accName" 
                value={formData.bankAccount.beneficiaryName} 
                onChange={e => setFormData(prev => ({ ...prev, bankAccount: { ...prev.bankAccount, beneficiaryName: e.target.value } }))}
                placeholder="Name as per bank record"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accNumber">Account Number*</Label>
              <Input 
                id="accNumber" 
                value={formData.bankAccount.accountNumber} 
                onChange={e => setFormData(prev => ({ ...prev, bankAccount: { ...prev.bankAccount, accountNumber: e.target.value } }))}
                placeholder="Enter account number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ifsc">IFSC Code*</Label>
              <Input 
                id="ifsc" 
                value={formData.bankAccount.ifsc} 
                onChange={e => setFormData(prev => ({ ...prev, bankAccount: { ...prev.bankAccount, ifsc: e.target.value } }))}
                placeholder="HDFC0001234"
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Delivery Radius (km)*</Label>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15].map(radius => (
                  <Button
                    key={radius}
                    variant={formData.maxDeliveryRadius === radius ? "default" : "outline"}
                    onClick={() => setFormData(prev => ({ ...prev, maxDeliveryRadius: radius }))}
                  >
                    {radius} km
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Customers within this distance from your store can order from you.
              </p>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base font-semibold">Enable Intercity Delivery</Label>
                <p className="text-xs text-muted-foreground">Deliver outside your city via courier</p>
              </div>
              <input 
                type="checkbox" 
                checked={formData.intercityEnabled}
                onChange={e => setFormData(prev => ({ ...prev, intercityEnabled: e.target.checked }))}
                className="w-5 h-5 accent-primary"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <div className="bg-primary/5 border-b sticky top-0 z-10">
        <div className="container max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-bold text-lg">Partner Onboarding</h1>
          <span className="text-sm font-medium text-primary">Step {currentStep + 1} of 4</span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1 bg-secondary">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="container max-w-lg mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">{STEPS[currentStep].title}</h2>
          <p className="text-muted-foreground">{STEPS[currentStep].description}</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex gap-4">
          {currentStep > 0 && (
            <Button 
              variant="outline" 
              className="flex-1 h-12"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <Button 
            className="flex-[2] h-12"
            onClick={handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              currentStep === STEPS.length - 1 ? "Submit Application" : "Continue"
            )}
            {!isSubmitting && currentStep < STEPS.length - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>

        {currentStep === 0 && (
          <p className="text-xs text-center text-muted-foreground mt-6">
            By continuing, you agree to our Partner Terms & Conditions.
          </p>
        )}
      </div>
    </div>
  );
}

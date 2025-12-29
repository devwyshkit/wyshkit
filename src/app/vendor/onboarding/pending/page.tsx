"use client";

import { CheckCircle2, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function OnboardingPendingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div 
        className="max-w-md w-full text-center space-y-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-12 h-12 text-primary animate-pulse" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1 border-4 border-background">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold">Application Received!</h1>
          <p className="text-muted-foreground text-lg">
            Your vendor application has been submitted and is currently under review by our team.
          </p>
        </div>

        <div className="bg-secondary/30 p-6 rounded-2xl space-y-4 text-left">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">What happens next?</h3>
          <ul className="space-y-3">
            <li className="flex gap-3 text-sm">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold">1</span>
              <span>Our team reviews your uploaded documents (24-48 hours)</span>
            </li>
            <li className="flex gap-3 text-sm">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold">2</span>
              <span>We'll verify your bank account via a ₹1 penny drop</span>
            </li>
            <li className="flex gap-3 text-sm">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold">3</span>
              <span>Once approved, you'll get full access to the Partner Dashboard</span>
            </li>
          </ul>
        </div>

        <div className="pt-6">
          <Button 
            variant="outline" 
            className="w-full h-12" 
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Need help? Contact partner-support@wyshkit.com
        </p>
      </motion.div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { OtpInput } from "@/components/auth/OtpInput";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import Image from "next/image";
import { signInWithGoogle } from "@/lib/auth/google-oauth";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();

  const oauthError = searchParams.get("error");

  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [otpError, setOtpError] = useState("");

  const validatePhone = (phoneNumber: string): boolean => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setPhoneError("Please enter a valid phone number");
      return false;
    }
    if (phoneNumber.startsWith("+")) {
      if (!/^\+\d{10,15}$/.test(phoneNumber)) {
        setPhoneError("Please enter a valid international phone number (e.g., +919740803490)");
        return false;
      }
    } else {
      if (phoneNumber.length !== 10 || !/^[6-9]\d{9}$/.test(phoneNumber)) {
        setPhoneError("Please enter a valid 10-digit Indian mobile number");
        return false;
      }
    }
    setPhoneError("");
    return true;
  };

  const handleSendOtp = async () => {
    if (!validatePhone(phone)) return;

    setIsLoading(true);
    setPhoneError("");

    try {
      const phoneNumber = phone.startsWith("+") ? phone : `+91${phone}`;
      
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      success("OTP sent successfully");
      setStep("otp");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send OTP";
      setPhoneError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (otpValue: string) => {
    if (otpValue.length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setOtpError("");

    try {
      const phoneNumber = phone.startsWith("+") ? phone : `+91${phone}`;
      
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber, otp: otpValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid OTP");
      }

      if (data.user) {
        success("Account created successfully");
        router.push("/");
        router.refresh();
        return;
      }

      success("OTP verified! Please enter your name");
      setStep("name");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Invalid OTP";
      setOtpError(errorMessage);
      showError(errorMessage);
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSignup = async () => {
    if (!name.trim()) {
      showError("Please enter your name");
      return;
    }

    setIsLoading(true);

    try {
      const phoneNumber = phone.startsWith("+") ? phone : `+91${phone}`;
      
      const response = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber, name: name.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      success("Account created successfully");
      router.push("/");
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create account";
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    await handleSendOtp();
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const oauthUrl = await signInWithGoogle();
      window.location.href = oauthUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in with Google";
      showError(errorMessage);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (oauthError) {
      const errorMessage = decodeURIComponent(oauthError);
      showError(errorMessage);
      router.replace("/signup", { scroll: false });
    }
  }, [oauthError, showError, router]);

  return (
    <div className="w-full space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </button>

      <div className="flex flex-col items-center gap-4">
        <Link href="/" className="relative w-16 h-16">
          <Image
            src="/logo.png"
            alt="WyshKit"
            fill
            className="object-contain"
            sizes="64px"
          />
        </Link>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            {step === "phone" && "Get started with your phone number"}
            {step === "otp" && "Enter the verification code"}
            {step === "name" && "Tell us your name"}
          </p>
        </div>
      </div>

      {oauthError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Authentication Error</p>
            <p className="text-xs text-destructive/80 mt-1">
              {decodeURIComponent(oauthError)}
            </p>
          </div>
        </div>
      )}

      {step === "phone" && (
        <div className="space-y-4">
          <PhoneInput
            value={phone}
            onChange={setPhone}
            error={phoneError}
            disabled={isLoading}
            autoFocus
          />

          <Button
            onClick={handleSendOtp}
            disabled={isLoading || phone.length < 10}
            className="w-full h-11"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Continue"
            )}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            variant="outline"
            className="w-full h-11"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing up...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="text-primary underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-4">
          <OtpInput
            value={otp}
            onChange={setOtp}
            onComplete={handleVerifyOtp}
            onResend={handleResendOtp}
            error={otpError}
            disabled={isLoading}
          />

          <Button
            onClick={() => handleVerifyOtp(otp)}
            disabled={isLoading || otp.length !== 6}
            className="w-full h-11"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify & Continue"
            )}
          </Button>

          <button
            onClick={() => {
              setStep("phone");
              setOtp("");
              setOtpError("");
            }}
            className="w-full text-sm text-primary font-medium"
            disabled={isLoading}
          >
            Change phone number
          </button>
        </div>
      )}

      {step === "name" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Your name (optional)</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              disabled={isLoading}
              autoFocus
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              This helps us personalize your experience
            </p>
          </div>

          <Button
            onClick={handleCompleteSignup}
            disabled={isLoading}
            className="w-full h-11"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating account...
              </>
            ) : (
              "Complete Signup"
            )}
          </Button>
        </div>
      )}

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Already have an account? </span>
        <Link href="/login" className="text-primary font-medium">
          Sign in
        </Link>
      </div>
    </div>
  );
}

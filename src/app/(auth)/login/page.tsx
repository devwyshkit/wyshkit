"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { OtpInput } from "@/components/auth/OtpInput";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import Image from "next/image";
import { signInWithGoogle } from "@/lib/auth/google-oauth";
import { logger } from "@/lib/utils/logger";

/**
 * Login page - Phone-first OTP authentication
 * Swiggy Dec 2025 pattern: Simple, clean, phone-first
 */
function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";
  const { success, error: showError } = useToast();

  const oauthError = searchParams.get("error");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  
  useEffect(() => {
    // Check if we have OAuth tokens in URL fragment (fragment-based flow)
    // This happens when Supabase redirects with tokens in hash instead of code in query
    // IMPORTANT: Check this FIRST, even if there's an error parameter
    // Supabase may redirect to /login?error=oauth_failed#access_token=... when redirect URL doesn't match
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      
      // If we have tokens in fragment, redirect to client-side callback handler
      // This takes priority over error handling - tokens mean OAuth succeeded
      if (accessToken) {
        logger.info("[Login] Detected OAuth tokens in fragment, redirecting to callback handler", {
          hasError: !!oauthError,
          hasToken: !!accessToken,
        });
        const state = params.get("state");
        
        // Preserve the entire fragment when redirecting
        // Build callback URL with state in query, fragment will be preserved by browser
        const callbackUrl = state 
          ? `/auth/callback?state=${encodeURIComponent(state)}`
          : "/auth/callback";
        
        // Use window.location to preserve the hash fragment
        // router.replace() might not preserve fragments correctly
        // Append the hash to ensure tokens are passed to callback handler
        const fullUrl = callbackUrl + window.location.hash;
        logger.debug("[Login] Redirecting to callback", { url: callbackUrl, hasHash: !!window.location.hash });
        
        // Swiggy Dec 2025 pattern: Add error handling for OAuth redirects
        // Browser extensions may interfere with redirects, so we handle errors gracefully
        try {
          window.location.href = fullUrl;
        } catch (redirectError) {
          // If window.location.href fails, try router.push as fallback
          logger.warn("[Login] window.location.href failed, trying router.push", {
            error: redirectError instanceof Error ? redirectError.message : String(redirectError),
            url: fullUrl,
          });
          // Note: router.push won't preserve hash fragments, but it's better than failing
          router.push(callbackUrl);
        }
        return;
      }
    }
    
    // Handle OAuth errors (but only if no tokens in fragment)
    if (oauthError) {
      const errorMessage = decodeURIComponent(oauthError);
      logger.warn("[Login] OAuth error detected", { error: errorMessage });
      showError(errorMessage);
      // Clear error from URL after showing it
      router.replace("/login", { scroll: false });
    }
  }, [oauthError, showError, router]);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [otpError, setOtpError] = useState("");

  // Debug: Log step changes
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      logger.info("[Login] Step changed", { step, isLoading, phone: phone.replace(/\d(?=\d{4})/g, "*") });
    }
  }, [step, isLoading, phone]);

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
      
      let response: Response;
      try {
        response = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phoneNumber }),
        });
      } catch (fetchError) {
        // Handle network errors (connection refused, timeout, etc.)
        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        const isDev = process.env.NODE_ENV === "development";
        
        if (
          errorMessage.includes("Failed to fetch") ||
          errorMessage.includes("ERR_CONNECTION_REFUSED") ||
          errorMessage.includes("NetworkError") ||
          errorMessage.includes("network")
        ) {
          const userMessage = isDev
            ? "Server is not running. Please start the dev server with 'npm run dev'."
            : "Unable to connect to server. Please check your internet connection and try again.";
          
          setPhoneError(userMessage);
          showError(userMessage);
          setIsLoading(false);
          logger.error("[Login] Connection error", {
            error: errorMessage,
            hint: isDev ? "Start dev server with: npm run dev" : undefined,
          });
          return;
        }
        
        // Re-throw other fetch errors
        throw fetchError;
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, check if response is ok
        if (response.ok) {
          // Response is ok but not JSON - treat as success
          logger.warn("[Login] OTP send response not JSON, but status is OK", {
            status: response.status,
            statusText: response.statusText,
          });
          success("OTP sent successfully");
          setStep("otp");
          setIsLoading(false);
          return;
        }
        throw new Error(`Failed to parse response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      if (!response.ok) {
        // Build user-friendly error message based on error code
        const errorCode = data.code || "";
        const errorMessage = data.error || "Failed to send OTP";
        const isDev = process.env.NODE_ENV === "development";
        
        // Handle specific error codes with actionable messages
        let userFriendlyMessage = errorMessage;
        
        if (errorCode === "SMS_NOT_CONFIGURED") {
          userFriendlyMessage = "SMS service is not configured. Please configure Twilio in Supabase Dashboard.";
          if (data.hint) {
            userFriendlyMessage += ` ${data.hint}`;
          }
        } else if (errorCode === "RATE_LIMIT") {
          userFriendlyMessage = "Too many requests. Please wait a moment and try again.";
        } else if (errorCode === "INVALID_PHONE" || errorCode === "INVALID_PHONE_FORMAT") {
          userFriendlyMessage = "Invalid phone number format. Please use international format (e.g., +919740803490).";
        } else if (errorCode === "SMS_SEND_FAILED") {
          // Enhanced error message for SMS send failures
          userFriendlyMessage = data.error || "Failed to send SMS.";
          if (data.hint) {
            userFriendlyMessage += `\n\n${data.hint}`;
          }
          // Add actionable steps
          userFriendlyMessage += "\n\nTroubleshooting steps:";
          userFriendlyMessage += "\n1. Check Twilio account balance (Twilio Console → Billing)";
          userFriendlyMessage += "\n2. Verify Twilio Verify Service is active (Twilio Console → Verify → Services)";
          userFriendlyMessage += "\n3. Check Supabase Dashboard → Authentication → Providers → Phone configuration";
          userFriendlyMessage += "\n4. Verify phone number format is correct (E.164: +919740803490)";
        }
        
        // In development, add technical details
        if (isDev) {
          if (data.code) {
            userFriendlyMessage += `\n\n[${data.code}]`;
          }
          if (data.details) {
            const detailsStr = typeof data.details === "string" 
              ? data.details 
              : JSON.stringify(data.details, null, 2);
            userFriendlyMessage += `\n\nDetails: ${detailsStr}`;
          }
          if (data.dashboardUrl) {
            userFriendlyMessage += `\n\nDashboard: ${data.dashboardUrl}`;
          }
          
          // Log full error for debugging
          logger.error("[Login] OTP send failed", {
            code: data.code,
            error: data.error,
            details: data.details,
            fullResponse: data,
            status: response.status,
          });
        }
        
        throw new Error(userFriendlyMessage);
      }

      // Success - check if data indicates success
      // Always transition to OTP step if response is ok (status 200-299)
      if (response.ok) {
        // Clear any previous errors first
        setPhoneError("");
        
        // Check for warnings about SMS provider
        if (data.warning) {
          // Don't show "OTP sent successfully" if there's a warning
          // Instead show the warning message
          showError(data.warning);
          logger.warn("[Login] OTP request accepted but SMS may not be sent", { warning: data.warning });
          // Still transition to OTP step so user can try entering OTP if they received it
        } else {
          // Show success message only if no warning
          success("OTP sent successfully");
        }
        
        // Change step to OTP
        setStep("otp");
        // Reset loading state
        setIsLoading(false);
        logger.info("[Login] Switched to OTP step", {
          phone: phoneNumber.replace(/\d(?=\d{4})/g, "*"),
          hasWarning: !!data.warning,
        });
      } else {
        throw new Error(data.error || "Failed to send OTP");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send OTP";
      setPhoneError(errorMessage);
      showError(errorMessage);
      setIsLoading(false);
      logger.error("[Login] OTP send error", {
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
      });
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
        // Build detailed error message
        const errorMessage = data.error || "Invalid OTP";
        const isDev = process.env.NODE_ENV === "development";
        
        // In development, show error code and details
        let fullErrorMessage = errorMessage;
        if (isDev && data.code) {
          fullErrorMessage += ` (Code: ${data.code})`;
        }
        if (isDev && data.details) {
          const detailsStr = typeof data.details === "string" 
            ? data.details 
            : JSON.stringify(data.details, null, 2);
          fullErrorMessage += `\n\nDetails: ${detailsStr}`;
        }
        
        // Log full error for debugging
        if (isDev) {
          logger.error("[Login] OTP verify failed", {
            code: data.code,
            error: data.error,
            details: data.details,
            fullResponse: data,
          });
        }
        
        throw new Error(fullErrorMessage);
      }

      success("Login successful");
      router.push(returnUrl);
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Invalid OTP";
      setOtpError(errorMessage);
      showError(errorMessage);
      setOtp("");
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
      const oauthUrl = await signInWithGoogle(returnUrl);
      window.location.href = oauthUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in with Google";
      showError(errorMessage);
      setIsLoading(false);
    }
  };

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
            src="/icon-192.png"
            alt="WyshKit"
            fill
            className="object-contain"
            sizes="64px"
            priority
          />
        </Link>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            {step === "phone" ? "Sign in to continue" : "Enter the verification code"}
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
                Signing in...
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
          <div className="text-center text-sm text-muted-foreground mb-2">
            Enter the 6-digit code sent to {phone.replace(/\d(?=\d{4})/g, "*")}
          </div>
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
              "Verify & Sign In"
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

      <div className="text-center text-sm">
        <span className="text-muted-foreground">New to WyshKit? </span>
        <Link href="/signup" className="text-primary font-medium">
          Create an account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16 bg-muted animate-pulse rounded-lg" />
          <div className="text-center space-y-1">
            <div className="h-7 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded mx-auto" />
          </div>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

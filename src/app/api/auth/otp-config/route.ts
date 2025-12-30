import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { isDevelopment } from "@/lib/config/env";
import { validateSupabaseUrl } from "@/lib/utils/supabase-validation";
import { createSupabaseServerClientWithRequest } from "@/lib/supabase/client";

/**
 * GET /api/auth/otp-config
 * Diagnostic endpoint to check OTP/SMS configuration status
 * Helps identify if issue is in Supabase Dashboard or code
 */
export async function GET() {
  try {
    const config = {
      supabase: {
        url: {
          set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          valid: false,
          value: isDevelopment ? process.env.NEXT_PUBLIC_SUPABASE_URL : "configured",
        },
        anonKey: {
          set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          value: isDevelopment ? "configured" : undefined,
        },
      },
      twilio: {
        accountSid: {
          set: !!process.env.TWILIO_ACCOUNT_SID,
          value: isDevelopment ? process.env.TWILIO_ACCOUNT_SID?.substring(0, 10) + "..." : undefined,
        },
        authToken: {
          set: !!process.env.TWILIO_AUTH_TOKEN,
          value: isDevelopment ? "configured" : undefined,
        },
        verifyServiceSid: {
          set: !!process.env.TWILIO_VERIFY_SERVICE_SID,
          value: isDevelopment ? process.env.TWILIO_VERIFY_SERVICE_SID : undefined,
        },
      },
      status: {
        codeReady: false,
        dashboardConfigured: "unknown" as "unknown" | "yes" | "no",
        message: "",
      },
    };

    // Validate Supabase URL
    if (config.supabase.url.set) {
      const urlValidation = validateSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
      config.supabase.url.valid = urlValidation.valid;
    }

    // Check if code is ready
    config.status.codeReady = 
      config.supabase.url.set &&
      config.supabase.url.valid &&
      config.supabase.anonKey.set &&
      config.twilio.accountSid.set &&
      config.twilio.authToken.set &&
      config.twilio.verifyServiceSid.set;

    // Determine status message
    if (!config.status.codeReady) {
      const missing: string[] = [];
      if (!config.supabase.url.set) missing.push("NEXT_PUBLIC_SUPABASE_URL");
      if (!config.supabase.anonKey.set) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
      if (!config.twilio.accountSid.set) missing.push("TWILIO_ACCOUNT_SID");
      if (!config.twilio.authToken.set) missing.push("TWILIO_AUTH_TOKEN");
      if (!config.twilio.verifyServiceSid.set) missing.push("TWILIO_VERIFY_SERVICE_SID");
      
      config.status.message = `Missing environment variables: ${missing.join(", ")}`;
      config.status.dashboardConfigured = "no";
    } else {
      config.status.message = "Code configuration is ready. Check Supabase Dashboard for SMS provider setup.";
      config.status.dashboardConfigured = "unknown";
    }

    // Try to test Supabase connection and get actual error
    let testError: any = null;
    let dashboardStatus: "unknown" | "configured" | "not_configured" = "unknown";
    
    if (config.status.codeReady) {
      try {
        // Create a test request to check Supabase client
        const testRequest = new Request("http://localhost/api/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        
        const supabase = await createSupabaseServerClientWithRequest(testRequest);
        if (supabase) {
          // Try to send a test OTP to see what error we get
          // We'll use a test phone number format to trigger the error
          const { error } = await supabase.auth.signInWithOtp({
            phone: "+919999999999", // Test number - will fail but show us the error
            options: { channel: 'sms' }
          });
          
          if (error) {
            testError = {
              code: error.code || "UNKNOWN",
              message: error.message || "Unknown error",
              status: error.status,
            };
            
            // Determine dashboard status based on error code and message
            const errorCode = error.code || "";
            const errorMsg = (error.message || "").toLowerCase();
            
            // Enhanced detection for SMS provider not configured
            if (
              errorCode === "sms_provider_not_configured" ||
              errorCode === "phone_provider_not_enabled" ||
              errorMsg.includes("sms provider") ||
              errorMsg.includes("phone provider") && (errorMsg.includes("disabled") || errorMsg.includes("not enabled")) ||
              (errorMsg.includes("twilio") && errorMsg.includes("not configured")) ||
              errorMsg.includes("sms service not configured") ||
              errorMsg.includes("no sms provider") ||
              errorMsg.includes("provider not found")
            ) {
              dashboardStatus = "not_configured";
            } else if (
              errorCode === "invalid_phone_number" ||
              errorCode === "rate_limit_exceeded" ||
              errorMsg.includes("invalid phone") || 
              errorMsg.includes("rate limit") ||
              errorMsg.includes("too many requests")
            ) {
              // These errors mean the provider IS configured, but there's another issue
              dashboardStatus = "configured";
            } else if (errorCode === "sms_sending_failed" || errorMsg.includes("failed to send")) {
              // SMS sending failed could mean provider is configured but there's an issue
              // Check if it's a Twilio-specific error (means provider is configured)
              if (errorMsg.includes("twilio") || errorMsg.includes("21212")) {
                dashboardStatus = "configured";
              } else {
                dashboardStatus = "unknown";
              }
            }
          } else {
            // No error means it might be working (though test number won't actually send)
            dashboardStatus = "configured";
          }
        }
      } catch (testErr) {
        // Ignore test errors - we're just trying to diagnose
        if (isDevelopment) {
          testError = {
            message: testErr instanceof Error ? testErr.message : String(testErr),
          };
        }
      }
    }

    config.status.dashboardConfigured = dashboardStatus;

    // Check port configuration
    // Note: In server-side context, we can't detect the actual port
    // User should set NEXT_PUBLIC_APP_URL to match their port
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const portMismatch = false; // Can't detect port mismatch server-side, but we'll provide guidance
    
    // Add helpful hints
    const hints: string[] = [];
    if (!config.status.codeReady) {
      hints.push("Add missing environment variables to .env.local");
    }
    
    if (!appUrl && isDevelopment) {
      hints.push("💡 Tip: Set NEXT_PUBLIC_APP_URL in .env.local if your app runs on a port other than 3000");
      hints.push("This ensures OAuth and Email Auth redirects work correctly");
    }
    
    if (dashboardStatus === "not_configured") {
      hints.push("⚠️ SMS provider (Twilio) is NOT configured in Supabase Dashboard");
      hints.push("Go to Supabase Dashboard → Authentication → Providers → Phone");
      hints.push("Enable Phone provider and configure Twilio credentials");
    } else if (dashboardStatus === "configured") {
      hints.push("✅ SMS provider appears to be configured");
      hints.push("If OTP still fails, check Twilio account balance and phone number format");
    } else {
      hints.push("Configure Twilio in Supabase Dashboard → Authentication → Providers → Phone");
      hints.push("Enter Twilio Account SID, Auth Token, and Verify Service SID in Supabase Dashboard");
    }

    return NextResponse.json({
      config: {
        ...config,
        test: testError ? {
          error: testError,
          note: "This is a diagnostic test. The actual error may differ when sending to a real phone number.",
        } : undefined,
      },
      hints,
      nextSteps: [
        "1. Ensure all environment variables are set in .env.local",
        "2. Set NEXT_PUBLIC_APP_URL=http://localhost:YOUR_PORT in .env.local (if port is not 3000)",
        "3. Go to Supabase Dashboard → Authentication → Providers → Phone",
        "4. Enable Phone provider (toggle ON)",
        "5. Select 'Twilio' as SMS provider",
        "6. Enter Twilio credentials:",
        "   - Account SID: AC5b2755f3368b771901559de123e52dc9",
        "   - Auth Token: f6f786e32dea6ae866a2e3b6c6444bf3",
        "   - Verify Service SID: VA69cb929c1fdd05362cd009be8f8a3f90",
        "7. Save configuration",
        "8. Configure redirect URLs in Supabase Dashboard → Authentication → URL Configuration (for OAuth)",
        "9. Test OTP sending with a real phone number",
      ],
      dashboardUrl: `https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'your-project'}/auth/providers`,
      portInfo: isDevelopment ? {
        appUrl: appUrl || undefined,
        note: appUrl 
          ? "✅ NEXT_PUBLIC_APP_URL is set. Ensure Supabase Dashboard redirect URLs match this port."
          : "💡 NEXT_PUBLIC_APP_URL not set. If app runs on port other than 3000, set it in .env.local",
        important: "Port mismatch affects OAuth/Email Auth, but NOT Phone OTP (SMS). See PORT_CONFIGURATION.md for details",
        recommendation: !appUrl 
          ? "Set NEXT_PUBLIC_APP_URL=http://localhost:YOUR_PORT in .env.local (replace YOUR_PORT with actual port)"
          : `Configure Supabase Dashboard redirect URLs to match ${appUrl}`,
      } : undefined,
    });
  } catch (error) {
    logger.error("[OTP Config] Diagnostic failed", error);
    return NextResponse.json(
      {
        error: "Failed to check configuration",
        details: isDevelopment 
          ? (error instanceof Error ? error.message : String(error))
          : undefined,
      },
      { status: 500 }
    );
  }
}


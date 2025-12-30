import { NextResponse } from "next/server";
import { env, isDevelopment } from "@/lib/config/env";
import { logger } from "@/lib/utils/logger";

/**
 * Diagnostic endpoint to check Twilio account status and Verify Service
 * Swiggy Dec 2025 pattern: Comprehensive diagnostics for troubleshooting
 */
export async function GET() {
  try {
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = env.TWILIO_VERIFY_SERVICE_SID;

    const status = {
      credentials: {
        accountSid: {
          set: !!accountSid,
          value: accountSid ? `${accountSid.substring(0, 4)}...${accountSid.substring(accountSid.length - 4)}` : undefined,
        },
        authToken: {
          set: !!authToken,
          value: authToken ? "configured" : undefined,
        },
        verifyServiceSid: {
          set: !!verifyServiceSid,
          value: verifyServiceSid || undefined,
        },
      },
      twilioApi: {
        reachable: false,
        accountStatus: "unknown" as "unknown" | "active" | "suspended" | "closed",
        accountBalance: null as number | null,
        verifyService: {
          exists: false,
          status: "unknown" as "unknown" | "active" | "suspended",
          friendlyName: null as string | null,
        },
        errors: [] as string[],
      },
    };

    // Check if credentials are available
    if (!accountSid || !authToken) {
      return NextResponse.json({
        status: "error",
        message: "Twilio credentials not found in environment",
        ...status,
        hints: [
          "Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env.local",
          "Get credentials from Twilio Console → Account → API Keys & Tokens",
        ],
      });
    }

    if (!verifyServiceSid) {
      return NextResponse.json({
        status: "warning",
        message: "Twilio Verify Service SID not found",
        ...status,
        hints: [
          "Add TWILIO_VERIFY_SERVICE_SID to .env.local",
          "Get Verify Service SID from Twilio Console → Verify → Services",
        ],
      });
    }

    // Try to check Twilio account status via API
    try {
      const accountUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
      const accountResponse = await fetch(accountUrl, {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
      });

      if (accountResponse.ok) {
        status.twilioApi.reachable = true;
        const accountData = await accountResponse.json();
        status.twilioApi.accountStatus = accountData.status || "unknown";
        
        // Try to get account balance (may require additional permissions)
        try {
          const balanceUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Balance.json`;
          const balanceResponse = await fetch(balanceUrl, {
            method: "GET",
            headers: {
              Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            },
          });
          
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            status.twilioApi.accountBalance = parseFloat(balanceData.balance || "0");
          }
        } catch (balanceError) {
          // Balance check may fail due to permissions - not critical
          status.twilioApi.errors.push("Could not fetch account balance (may require additional permissions)");
        }
      } else {
        const errorData = await accountResponse.json().catch(() => ({}));
        status.twilioApi.errors.push(
          `Failed to verify account: ${errorData.message || `HTTP ${accountResponse.status}`}`
        );
        
        if (accountResponse.status === 401) {
          status.twilioApi.errors.push("Invalid Twilio credentials - check Account SID and Auth Token");
        }
      }
    } catch (apiError) {
      status.twilioApi.errors.push(
        `Twilio API error: ${apiError instanceof Error ? apiError.message : String(apiError)}`
      );
    }

    // Try to check Verify Service status
    if (verifyServiceSid && status.twilioApi.reachable) {
      try {
        const verifyServiceUrl = `https://verify.twilio.com/v2/Services/${verifyServiceSid}`;
        const verifyResponse = await fetch(verifyServiceUrl, {
          method: "GET",
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          },
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          status.twilioApi.verifyService.exists = true;
          status.twilioApi.verifyService.status = verifyData.status || "unknown";
          status.twilioApi.verifyService.friendlyName = verifyData.friendly_name || null;
        } else {
          const errorData = await verifyResponse.json().catch(() => ({}));
          if (verifyResponse.status === 404) {
            status.twilioApi.verifyService.exists = false;
            status.twilioApi.errors.push(
              `Verify Service not found: ${verifyServiceSid}. Service may have been deleted or SID is incorrect.`
            );
          } else {
            status.twilioApi.errors.push(
              `Failed to verify service: ${errorData.message || `HTTP ${verifyResponse.status}`}`
            );
          }
        }
      } catch (verifyError) {
        status.twilioApi.errors.push(
          `Verify Service API error: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`
        );
      }
    }

    // Determine overall status
    let overallStatus: "ok" | "warning" | "error" = "ok";
    let message = "Twilio configuration appears valid";

    if (status.twilioApi.errors.length > 0) {
      overallStatus = "error";
      message = "Twilio API errors detected";
    } else if (!status.twilioApi.reachable) {
      overallStatus = "warning";
      message = "Could not verify Twilio account status";
    } else if (!status.twilioApi.verifyService.exists) {
      overallStatus = "error";
      message = "Verify Service not found";
    } else if (status.twilioApi.accountStatus !== "active") {
      overallStatus = "warning";
      message = `Twilio account status: ${status.twilioApi.accountStatus}`;
    } else if (status.twilioApi.accountBalance !== null && status.twilioApi.accountBalance <= 0) {
      overallStatus = "warning";
      message = "Twilio account balance is low or zero";
    }

    const hints: string[] = [];
    
    if (!status.twilioApi.verifyService.exists) {
      hints.push(
        `Verify Service ${verifyServiceSid} not found. Check Twilio Console → Verify → Services.`,
        "Ensure Verify Service SID matches Supabase Dashboard configuration."
      );
    }
    
    if (status.twilioApi.accountBalance !== null && status.twilioApi.accountBalance <= 0) {
      hints.push(
        `Account balance: $${status.twilioApi.accountBalance.toFixed(2)}. Add credits in Twilio Console → Billing.`
      );
    }
    
    if (status.twilioApi.accountStatus !== "active") {
      hints.push(
        `Account status: ${status.twilioApi.accountStatus}. Check Twilio Console → Account → Settings.`
      );
    }

    if (hints.length === 0 && overallStatus === "ok") {
      hints.push("✅ Twilio configuration appears valid");
      hints.push("If OTP still fails, check Supabase Dashboard → Authentication → Providers → Phone");
    }

    return NextResponse.json({
      status: overallStatus,
      message,
      ...status,
      hints,
      nextSteps: overallStatus !== "ok" ? [
        "1. Check Twilio Console → Account → Settings (verify account is active)",
        "2. Check Twilio Console → Verify → Services (verify service exists and is active)",
        "3. Check Twilio Console → Billing (ensure account has credits)",
        "4. Verify Supabase Dashboard → Authentication → Providers → Phone → Twilio Verify Service SID matches",
        "5. Test OTP sending with a real phone number",
      ] : [
        "1. Verify Supabase Dashboard → Authentication → Providers → Phone is configured",
        "2. Test OTP sending with a real phone number",
        "3. Check Supabase Dashboard → Logs → Auth for delivery errors",
      ],
      twilioConsoleUrl: accountSid 
        ? `https://console.twilio.com/us1/develop/verify/services/${verifyServiceSid || ''}`
        : undefined,
      ...(isDevelopment && {
        debug: {
          accountSid: accountSid?.substring(0, 4) + "..." + accountSid?.substring(accountSid.length - 4),
          verifyServiceSid,
        },
      }),
    });
  } catch (error) {
    logger.error("[Twilio Status] Unexpected error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        status: "error",
        message: "Failed to check Twilio status",
        error: error instanceof Error ? error.message : String(error),
        ...(isDevelopment && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 }
    );
  }
}






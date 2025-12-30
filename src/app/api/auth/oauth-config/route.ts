import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/client";
import { env } from "@/lib/config/env";

/**
 * GET /api/auth/oauth-config
 * Diagnostic endpoint for OAuth configuration
 * Checks redirect URLs, environment variables, and provides recommendations
 */
export async function GET() {
  const isDevelopment = process.env.NODE_ENV === "development";
  
  try {
    const results: {
      configuration: {
        redirectUrl: string | null;
        appUrl: string | null;
        supabaseUrl: string | null;
        googleOAuthEnabled: boolean;
        issues: string[];
        recommendations: string[];
      };
      environment: {
        NEXT_PUBLIC_APP_URL: { set: boolean; value?: string };
        NEXT_PUBLIC_SUPABASE_URL: { set: boolean; value?: string };
        NEXT_PUBLIC_SUPABASE_ANON_KEY: { set: boolean; value?: string };
      };
      redirectUrl: {
        expected: string;
        actual: string | null;
        matches: boolean;
        note: string;
      };
      overall: {
        healthy: boolean;
        issues: string[];
        recommendations: string[];
      };
    } = {
      configuration: {
        redirectUrl: null,
        appUrl: null,
        supabaseUrl: null,
        googleOAuthEnabled: false,
        issues: [],
        recommendations: [],
      },
      environment: {
        NEXT_PUBLIC_APP_URL: { set: false },
        NEXT_PUBLIC_SUPABASE_URL: { set: false },
        NEXT_PUBLIC_SUPABASE_ANON_KEY: { set: false },
      },
      redirectUrl: {
        expected: "",
        actual: null,
        matches: false,
        note: "",
      },
      overall: {
        healthy: true,
        issues: [],
        recommendations: [],
      },
    };

    // Check environment variables
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || null;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;

    results.environment.NEXT_PUBLIC_APP_URL = {
      set: !!appUrl,
      value: appUrl ? (isDevelopment ? appUrl : "***") : undefined,
    };

    results.environment.NEXT_PUBLIC_SUPABASE_URL = {
      set: !!supabaseUrl,
      value: supabaseUrl ? (isDevelopment ? supabaseUrl : "***") : undefined,
    };

    results.environment.NEXT_PUBLIC_SUPABASE_ANON_KEY = {
      set: !!supabaseAnonKey,
      value: supabaseAnonKey ? (isDevelopment ? `${supabaseAnonKey.substring(0, 20)}...` : "***") : undefined,
    };

    // Determine expected redirect URL
    const expectedRedirectUrl = appUrl 
      ? `${appUrl}/api/auth/google/callback`
      : "http://localhost:3000/api/auth/google/callback"; // Default assumption

    results.redirectUrl.expected = expectedRedirectUrl;
    results.configuration.redirectUrl = expectedRedirectUrl;
    results.configuration.appUrl = appUrl;
    results.configuration.supabaseUrl = supabaseUrl;

    // Check if Supabase is configured
    const supabase = getSupabaseServiceClient();
    if (supabase && supabaseUrl) {
      results.configuration.googleOAuthEnabled = true; // Assume enabled if Supabase is connected
    } else {
      results.configuration.issues.push("Supabase not configured or not connected");
      results.configuration.recommendations.push("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
      results.overall.healthy = false;
    }

    // Check for port mismatch
    if (appUrl) {
      const appPort = new URL(appUrl).port || (appUrl.includes(":3000") ? "3000" : appUrl.includes(":3001") ? "3001" : "");
      if (appPort && appPort !== "3000") {
        results.configuration.recommendations.push(
          `App runs on port ${appPort}. Ensure Supabase Dashboard redirect URLs include: ${expectedRedirectUrl}`
        );
      }
    } else {
      results.configuration.issues.push("NEXT_PUBLIC_APP_URL not set");
      results.configuration.recommendations.push(
        "Set NEXT_PUBLIC_APP_URL in .env.local if app runs on port other than 3000"
      );
    }

    // Compile overall status
    if (results.configuration.issues.length > 0) {
      results.overall.issues.push(...results.configuration.issues);
      results.overall.healthy = false;
    }

    if (!results.environment.NEXT_PUBLIC_SUPABASE_URL.set) {
      results.overall.issues.push("NEXT_PUBLIC_SUPABASE_URL is not set");
      results.overall.recommendations.push("Set NEXT_PUBLIC_SUPABASE_URL in .env.local");
      results.overall.healthy = false;
    }

    if (!results.environment.NEXT_PUBLIC_SUPABASE_ANON_KEY.set) {
      results.overall.issues.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
      results.overall.recommendations.push("Set NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
      results.overall.healthy = false;
    }

    // Add Supabase Dashboard configuration recommendations
    results.overall.recommendations.push(
      "1. Go to Supabase Dashboard → Authentication → Providers → Google",
      "2. Enable Google provider and configure OAuth credentials",
      `3. Add redirect URL to Supabase Dashboard: ${expectedRedirectUrl}`,
      "4. Ensure Site URL matches your app URL in Supabase Dashboard → Authentication → URL Configuration"
    );

    const statusCode = results.overall.healthy ? 200 : 503;

    return NextResponse.json(results, { status: statusCode });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      {
        configuration: {
          redirectUrl: null,
          appUrl: null,
          supabaseUrl: null,
          googleOAuthEnabled: false,
          issues: ["Configuration check failed"],
          recommendations: [],
        },
        environment: {
          NEXT_PUBLIC_APP_URL: { set: false },
          NEXT_PUBLIC_SUPABASE_URL: { set: false },
          NEXT_PUBLIC_SUPABASE_ANON_KEY: { set: false },
        },
        redirectUrl: {
          expected: "",
          actual: null,
          matches: false,
          note: "Could not determine redirect URL",
        },
        overall: {
          healthy: false,
          issues: [errorMessage],
          recommendations: ["Check server logs for details"],
        },
      },
      { status: 503 }
    );
  }
}





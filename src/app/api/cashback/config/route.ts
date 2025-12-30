import { NextResponse } from "next/server";
import { createSupabaseServerClientWithRequest, getSupabaseServiceClient } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import { normalizeQueryParam } from "@/lib/utils/api-helpers";
import { appConfig } from "@/lib/config/app";
import { requireRole } from "@/lib/auth/server";
import { isAuthError, formatApiError } from "@/lib/types/api-errors";

/**
 * GET /api/cashback/config
 * Fetch active cashback configuration
 * Returns: global config + category/vendor overrides
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = normalizeQueryParam(searchParams.get("categoryId"));
    const vendorId = normalizeQueryParam(searchParams.get("vendorId"));

    // Use Supabase client (public read access for cashback config)
    const supabase = await createSupabaseServerClientWithRequest(request);
    if (!supabase) {
      // Fallback to app config if Supabase not available
      return NextResponse.json({
        percentage: appConfig.cashback.rate,
        global: appConfig.cashback.rate,
        category: null,
        vendor: null,
      });
    }

    // Fetch global config using Supabase client
    // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
    // RLS policy is source of truth - it already filters by is_active
    const { data: globalConfigData, error: globalError } = await supabase
      .from('cashback_config')
      .select('id, type, entity_id, percentage, is_active, created_at, updated_at')
      .eq('type', 'global')
      .maybeSingle();

    if (globalError && globalError.code !== 'PGRST116') {
      logger.error("[API /cashback/config] Failed to fetch global config", globalError);
    }

    const globalConfig = globalConfigData || null;

    // Fetch category override if categoryId provided
    let categoryOverride = null;
    if (categoryId) {
      // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
      // RLS policy is source of truth - it already filters by is_active
      const { data: categoryData, error: categoryError } = await supabase
        .from('cashback_config')
        .select('id, type, entity_id, percentage, is_active, created_at, updated_at')
        .eq('type', 'category')
        .eq('entity_id', categoryId)
        .maybeSingle();

      if (categoryError && categoryError.code !== 'PGRST116') {
        logger.error("[API /cashback/config] Failed to fetch category override", categoryError);
      } else {
        categoryOverride = categoryData || null;
      }
    }

    // Fetch vendor override if vendorId provided
    let vendorOverride = null;
    if (vendorId) {
      // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
      // RLS policy is source of truth - it already filters by is_active
      const { data: vendorData, error: vendorError } = await supabase
        .from('cashback_config')
        .select('id, type, entity_id, percentage, is_active, created_at, updated_at')
        .eq('type', 'vendor')
        .eq('entity_id', vendorId)
        .maybeSingle();

      if (vendorError && vendorError.code !== 'PGRST116') {
        logger.error("[API /cashback/config] Failed to fetch vendor override", vendorError);
      } else {
        vendorOverride = vendorData || null;
      }
    }

    // Determine effective cashback percentage (vendor > category > global > default)
    let effectivePercentage = appConfig.cashback.rate; // Default 10%
    if (globalConfig) {
      effectivePercentage = parseFloat(globalConfig.percentage || "0");
    }
    if (categoryOverride) {
      effectivePercentage = parseFloat(categoryOverride.percentage || "0");
    }
    if (vendorOverride) {
      effectivePercentage = parseFloat(vendorOverride.percentage || "0");
    }

    return NextResponse.json({
      percentage: effectivePercentage,
      global: globalConfig ? parseFloat(globalConfig.percentage || "0") : appConfig.cashback.rate,
      category: categoryOverride ? parseFloat(categoryOverride.percentage || "0") : null,
      vendor: vendorOverride ? parseFloat(vendorOverride.percentage || "0") : null,
    });
  } catch (error) {
    logger.error("[API /cashback/config] Error", error);
    return NextResponse.json(
      { error: "Failed to fetch cashback config", percentage: appConfig.cashback.rate },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cashback/config
 * Admin-only: Update cashback configuration
 */
export async function POST(request: Request) {
  try {
    // Require admin role
    await requireRole(request, "admin");
    const body = await request.json();
    const { type, entityId, percentage, isActive } = body;

    // Use service role client for admin operations
    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }

    // Validate
    if (!type || !["global", "category", "vendor"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    if (type !== "global" && !entityId) {
      return NextResponse.json({ error: "entityId required for category/vendor type" }, { status: 400 });
    }

    if (percentage < 0 || percentage > 100) {
      return NextResponse.json({ error: "Percentage must be between 0 and 100" }, { status: 400 });
    }

    // Check if existing config exists using Supabase client
    // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
    let query = supabase
      .from('cashback_config')
      .select('id, type, entity_id, percentage, is_active, created_at, updated_at')
      .eq('type', type);
    
    if (entityId) {
      query = query.eq('entity_id', entityId);
    } else {
      query = query.is('entity_id', null);
    }

    const { data: existingData, error: selectError } = await query.maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      logger.error("[API /cashback/config] Failed to check existing config", selectError);
      return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
    }

    if (existingData) {
      // Update existing
      const { error: updateError } = await supabase
        .from('cashback_config')
        .update({
          percentage: percentage.toString(),
          is_active: isActive !== undefined ? isActive : true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingData.id);

      if (updateError) {
        logger.error("[API /cashback/config] Failed to update config", updateError);
        return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
      }
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('cashback_config')
        .insert({
          type,
          entity_id: entityId || null,
          percentage: percentage.toString(),
          is_active: isActive !== undefined ? isActive : true,
        });

      if (insertError) {
        logger.error("[API /cashback/config] Failed to insert config", insertError);
        return NextResponse.json({ error: "Failed to create config" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Handle authentication errors
    if (isAuthError(error)) {
      logger.warn("[API /cashback/config] Authentication required for admin action");
      return NextResponse.json(
        { error: "Admin access required. You do not have permission to modify cashback configuration." },
        { status: 403 }
      );
    }
    
    logger.error("[API /cashback/config] Error updating config", error);
    const errorResponse = formatApiError(error);
    return NextResponse.json(
      { 
        error: errorResponse.error || "Unable to update cashback configuration. Please try again. If the problem persists, contact support.",
        code: "CASHBACK_CONFIG_UPDATE_FAILED"
      },
      { status: 500 }
    );
  }
}



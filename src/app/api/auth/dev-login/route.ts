import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { cookies } from "next/headers";
import { getSupabaseServiceClient } from "@/lib/supabase/client";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") || "vendor";

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  let testUser;

  const { data: users, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", role)
    .limit(1);

  if (error) {
    logger.error("[Dev Login] Failed to fetch user", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }

  if (users && users.length > 0) {
    testUser = users[0];
  } else {
    logger.info(`[Dev Login] No ${role} user found, creating one...`);
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        phone: role === "vendor" ? "+910000000000" : role === "admin" ? "+911111111111" : "+912222222222",
        role: role,
        name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        city: "Bangalore",
      })
      .select()
      .single();

    if (createError) {
      logger.error("[Dev Login] Failed to create user", createError);
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
    testUser = newUser;
  }

  if (role === "vendor") {
    const { data: existingVendor } = await supabase
      .from("vendors")
      .select("*")
      .eq("user_id", testUser.id)
      .limit(1)
      .single();

    if (!existingVendor) {
      logger.info(`[Dev Login] Creating missing vendor profile for ${testUser.id}`);
      await supabase.from("vendors").insert({
        user_id: testUser.id,
        name: "Test Artisan Store",
        city: "Bangalore",
        zones: ["Koramangala", "HSR Layout"],
        onboarding_status: "approved",
        status: "approved",
        is_hyperlocal: true,
        is_online: true,
      });
    } else if (existingVendor.onboarding_status !== "approved") {
      logger.info(`[Dev Login] Updating vendor onboarding status for ${testUser.id}`);
      await supabase
        .from("vendors")
        .update({ onboarding_status: "approved", status: "approved" })
        .eq("user_id", testUser.id);
    }
  }

  const cookieStore = await cookies();

  cookieStore.set("dev_auth_user_id", testUser.id, {
    httpOnly: false,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  cookieStore.set("dev_auth_role", testUser.role, {
    httpOnly: false,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  logger.info("[Dev Login] Created dev session", { userId: testUser.id, role: testUser.role });

  const redirectUrl = role === "vendor" ? "/vendor" : role === "admin" ? "/admin" : "/";

  return NextResponse.redirect(new URL(redirectUrl, request.url));
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/client";

const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(["order", "account", "promotion"]),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(500),
  data: z.record(z.unknown()).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const userId = user.id;

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not available", notifications: [] }, { status: 503 });
    }

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq("read", false);
    }

    const { data: userNotifications, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      notifications: (userNotifications || []).map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        data: n.data || {},
        createdAt: n.created_at,
      })),
    });
  } catch (error) {
    logger.error("[API /notifications] Failed", error);
    return NextResponse.json({ error: "Failed to fetch notifications", notifications: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, type, title, message, data } = createNotificationSchema.parse(body);

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const { data: newNotification, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        message,
        read: false,
        data: data || {},
      })
      .select()
      .single();

    if (error) throw error;

    logger.info("[API /notifications] Notification created", { id: newNotification.id, userId, type });

    return NextResponse.json({
      success: true,
      notification: {
        id: newNotification.id,
        type: newNotification.type,
        title: newNotification.title,
        message: newNotification.message,
        read: newNotification.read,
        data: newNotification.data || {},
        createdAt: newNotification.created_at,
      },
    });
  } catch (error) {
    logger.error("[API /notifications] Failed to create", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { notificationId, markAllAsRead } = z.object({
      notificationId: z.string().uuid().optional(),
      markAllAsRead: z.boolean().optional(),
    }).parse(body);

    const user = await requireAuth(request);
    const userId = user.id;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    if (markAllAsRead) {
      await supabase
        .from("notifications")
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      logger.info("[API /notifications] All notifications marked as read", { userId });
    } else if (notificationId) {
      const { data: updated, error } = await supabase
        .from("notifications")
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error || !updated) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }

      logger.info("[API /notifications] Notification marked as read", { notificationId });
    } else {
      return NextResponse.json({ error: "notificationId or markAllAsRead required" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[API /notifications] Failed to update", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

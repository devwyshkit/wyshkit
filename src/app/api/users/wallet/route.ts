import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wallet, walletTransactions, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";
import { isAuthError, isErrorWithStatus, formatApiError } from "@/lib/types/api-errors";
import { getSupabaseServiceClient } from "@/lib/supabase/client";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const userId = user.id;

    if (!db) {
      logger.warn("[API /users/wallet] Database not available");
      return NextResponse.json({
        wallet: {
          balance: 0,
          history: [],
        },
      });
    }

    // Check if user exists in users table first (Swiggy Dec 2025 pattern: Ensure user exists)
    let userExists = false;
    try {
      const userCheck = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      userExists = userCheck.length > 0;
    } catch (userCheckError: any) {
      // If RLS recursion error (42P17), create user via service client
      if (userCheckError?.code === '42P17' || userCheckError?.message?.includes('infinite recursion')) {
        logger.warn("[API /users/wallet] RLS recursion error, creating user via service client", { userId });
        const supabaseService = getSupabaseServiceClient();
        if (supabaseService) {
          try {
            await supabaseService
              .from('users')
              .insert({
                id: userId,
                phone: `sync_${userId}`,
                role: 'customer',
              });
            userExists = true;
            logger.info("[API /users/wallet] User created via service client", { userId });
          } catch (createError) {
            logger.error("[API /users/wallet] Failed to create user via service client", createError);
          }
        }
      } else {
        logger.error("[API /users/wallet] Failed to check user existence", userCheckError);
      }
    }

    // If user doesn't exist, create via service client (Swiggy Dec 2025 pattern: Guarantee user exists)
    if (!userExists) {
      logger.warn("[API /users/wallet] User not found in users table, creating via service client", { userId });
      const supabaseService = getSupabaseServiceClient();
      if (supabaseService) {
        try {
          await supabaseService
            .from('users')
            .insert({
              id: userId,
              phone: `sync_${userId}`,
              role: 'customer',
            });
          logger.info("[API /users/wallet] User created via service client", { userId });
        } catch (createError: any) {
          logger.error("[API /users/wallet] Failed to create user via service client", {
            error: createError.message,
            code: createError.code,
            userId,
          });
          // Continue anyway - wallet might still work
        }
      }
    }

    let userWallet = await db
      .select()
      .from(wallet)
      .where(eq(wallet.userId, userId))
      .limit(1);

    let walletId: string | null = null;
    let balance = 0;

    if (userWallet.length === 0) {
      try {
        const [newWallet] = await db
          .insert(wallet)
          .values({
            userId: userId,
            balance: "0",
          })
          .returning();
        
        walletId = newWallet.id;
        balance = 0;
        logger.info("[API /users/wallet] Auto-created wallet for user", userId);
      } catch (insertError: unknown) {
        const errorMessage = insertError instanceof Error ? insertError.message : String(insertError);
        const errorCode = (insertError as { code?: string })?.code;
        
        if (errorCode === "23505" || errorMessage.includes("unique")) {
          const [existingWallet] = await db
            .select()
            .from(wallet)
            .where(eq(wallet.userId, userId))
            .limit(1);
          if (existingWallet) {
            walletId = existingWallet.id;
            balance = parseFloat(existingWallet.balance);
          } else {
            throw insertError;
          }
        } else {
          throw insertError;
        }
      }
    } else {
      walletId = userWallet[0].id;
      balance = parseFloat(userWallet[0].balance);
    }

    const transactions: Array<{
      id: string;
      type: string;
      amount: number;
      description: string | null;
      orderId: string | null;
      createdAt: string | undefined;
    }> = [];
    
    if (walletId) {
      const txns = await db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.walletId, walletId))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(10);

      transactions.push(...txns.map((txn) => ({
        id: txn.id,
        type: txn.type,
        amount: parseFloat(txn.amount),
        description: txn.description,
        orderId: txn.orderId,
        createdAt: txn.createdAt?.toISOString(),
      })));
    }

    logger.info("[API /users/wallet] Fetched wallet for user", userId);

    return NextResponse.json({
      wallet: {
        balance,
        history: transactions,
      },
    });
  } catch (error: unknown) {
    if (isAuthError(error) || (isErrorWithStatus(error) && error.status === 401)) {
      logger.warn("[API /users/wallet] Authentication required");
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    logger.error("[API /users/wallet] GET error", error);
    const errorResponse = formatApiError(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Script to remove default admin accounts
 * Run this to clean up any test/admin accounts that shouldn't exist
 * 
 * Usage:
 *   npx tsx src/scripts/remove-default-admin.ts
 * 
 * Or via API:
 *   POST /api/admin/cleanup-default-accounts (requires admin auth)
 */

import { db } from "@/lib/db/index";
import { users } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { getSupabaseServiceClient } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";

// Default admin accounts that should NOT exist
const DEFAULT_ADMIN_ACCOUNTS = [
  {
    email: "admin@example.com",
    phone: "+919876543214",
    id: "00000000-0000-0000-0000-000000000005",
  },
];

async function removeDefaultAdminAccounts() {
  try {
    logger.info("[Remove Default Admin] Starting cleanup...");

    const supabaseService = getSupabaseServiceClient();
    let removedCount = 0;

    for (const defaultAdmin of DEFAULT_ADMIN_ACCOUNTS) {
      try {
        // Check if account exists in database
        const dbUsers = await db
          .select()
          .from(users)
          .where(
            or(
              eq(users.email, defaultAdmin.email),
              eq(users.phone, defaultAdmin.phone),
              eq(users.id, defaultAdmin.id)
            )
          );

        if (dbUsers.length > 0) {
          logger.warn(`[Remove Default Admin] Found default admin account: ${defaultAdmin.email || defaultAdmin.phone}`);
          
          // Remove from database
          await db
            .delete(users)
            .where(
              or(
                eq(users.email, defaultAdmin.email),
                eq(users.phone, defaultAdmin.phone),
                eq(users.id, defaultAdmin.id)
              )
            );
          
          logger.info(`[Remove Default Admin] Removed from database: ${defaultAdmin.email || defaultAdmin.phone}`);
          
          // Remove from Supabase Auth if service client is available
          if (supabaseService) {
            try {
              // Try to get user by ID first
              const { data: authUser } = await supabaseService.auth.admin.getUserById(defaultAdmin.id);
              
              if (authUser?.user) {
                await supabaseService.auth.admin.deleteUser(defaultAdmin.id);
                logger.info(`[Remove Default Admin] Removed from Supabase Auth: ${defaultAdmin.id}`);
              } else {
                // Try to find by email or phone
                const { data: usersByEmail } = await supabaseService.auth.admin.listUsers();
                const matchingUser = usersByEmail.users.find(
                  (u) => u.email === defaultAdmin.email || u.phone === defaultAdmin.phone
                );
                
                if (matchingUser) {
                  await supabaseService.auth.admin.deleteUser(matchingUser.id);
                  logger.info(`[Remove Default Admin] Removed from Supabase Auth: ${matchingUser.id}`);
                }
              }
            } catch (authError) {
              logger.error(`[Remove Default Admin] Failed to remove from Supabase Auth:`, authError);
            }
          }
          
          removedCount++;
        } else {
          logger.debug(`[Remove Default Admin] No default admin account found: ${defaultAdmin.email || defaultAdmin.phone}`);
        }
      } catch (error) {
        logger.error(`[Remove Default Admin] Error processing ${defaultAdmin.email || defaultAdmin.phone}:`, error);
      }
    }

    if (removedCount > 0) {
      logger.info(`[Remove Default Admin] Cleanup completed. Removed ${removedCount} default admin account(s).`);
    } else {
      logger.info("[Remove Default Admin] No default admin accounts found. Cleanup completed.");
    }

    return { removedCount };
  } catch (error) {
    logger.error("[Remove Default Admin] Cleanup failed:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module || (import.meta as any).main) {
  removeDefaultAdminAccounts()
    .then((result) => {
      logger.info(`[Remove Default Admin] Script completed. Removed ${result.removedCount} account(s).`);
      process.exit(0);
    })
    .catch((error) => {
      logger.error("[Remove Default Admin] Script failed:", error);
      process.exit(1);
    });
}

export { removeDefaultAdminAccounts };





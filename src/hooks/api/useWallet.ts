"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/utils/logger";
import { deduplicateRequest } from "@/lib/utils/request-dedup";

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  orderId: string | null;
  createdAt: string | undefined;
}

interface UseWalletResult {
  balance: number;
  transactions: WalletTransaction[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch user's wallet balance using direct Supabase query
 * Swiggy Dec 2025 pattern: Direct Supabase queries with RLS-based filtering
 * RLS policies ensure user can only see their own wallet
 */
export function useWallet(): UseWalletResult {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    // Don't fetch on server-side
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    // Wait for auth to load
    if (!user) {
      setLoading(false);
      setError(null);
      setBalance(0);
      setTransactions([]);
      return;
    }

    // Swiggy Dec 2025 pattern: Deduplicate concurrent requests
    await deduplicateRequest(`wallet:${user.id}`, async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = getSupabaseClient();
        if (!supabase) {
          setError("Service temporarily unavailable");
          setBalance(0);
          setTransactions([]);
          setLoading(false);
          return;
        }

        // Swiggy Dec 2025 pattern: Direct Supabase query with specific fields
        // RLS policies ensure user can only see their own wallet
        const { data: walletData, error: walletError } = await supabase
          .from('wallet')
          .select('id, balance')
          .eq('user_id', user.id)
          .maybeSingle();

        if (walletError && walletError.code !== 'PGRST116') {
          setError(walletError.message || "Failed to fetch wallet");
          setBalance(0);
          setTransactions([]);
          return;
        }

        const walletBalance = walletData ? parseFloat(walletData.balance || "0") : 0;
        const walletId = walletData?.id || null;

        setBalance(walletBalance);

        // Fetch transactions if wallet exists
        if (walletId) {
          const { data: transactionsData, error: transactionsError } = await supabase
            .from('wallet_transactions')
            .select('id, type, amount, description, order_id, created_at')
            .eq('wallet_id', walletId)
            .order('created_at', { ascending: false })
            .limit(10);

          if (transactionsError) {
            logger.error("[useWallet] Failed to fetch transactions", transactionsError);
            // Continue with balance even if transactions fail
          } else {
            const formattedTransactions: WalletTransaction[] = (transactionsData || []).map((t: any) => ({
              id: t.id,
              type: t.type,
              amount: parseFloat(t.amount || "0"),
              description: t.description,
              orderId: t.order_id,
              createdAt: t.created_at,
            }));
            setTransactions(formattedTransactions);
          }
        } else {
          setTransactions([]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch wallet";
        logger.error("[useWallet] Error", err);
        setError(errorMessage);
        setBalance(0);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    });
  }, [user]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  return {
    balance,
    transactions,
    loading,
    error,
    refetch: fetchWallet,
  };
}


"use client";

import { useState, useEffect } from "react";
import { 
  Wallet, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronRight,
  Loader2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { ApiError } from "@/components/errors/ApiError";

interface Transaction {
  id: string;
  orderNumber: string;
  amount: number;
  orderTotal: number;
  status: "settled" | "pending";
  settledAt?: string;
  createdAt: string;
}

interface PayoutData {
  transactions: Transaction[];
  summary: {
    totalSettled: number;
    totalPending: number;
    transactionCount: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function PayoutsContent() {
  const { user } = useAuth();
  const [data, setData] = useState<PayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user || user.role !== "vendor") return;
    fetchPayouts();
  }, [user, page]);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<PayoutData>(`/vendor/payouts?page=${page}`);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payouts");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <ApiError message={error} onRetry={fetchPayouts} />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 pb-24 md:pb-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Payouts</h1>
          <p className="text-muted-foreground mt-1">Track your settlements and transactions</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-green-700">Settled</span>
              </div>
              <p className="text-2xl font-bold text-green-800">
                ₹{data.summary.totalSettled.toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-yellow-600" />
                <span className="text-xs font-medium text-yellow-700">Pending</span>
              </div>
              <p className="text-2xl font-bold text-yellow-800">
                ₹{data.summary.totalPending.toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <p className="text-xs text-blue-700">
              <strong>Settlement Policy:</strong> Funds are released to your bank account within 
              T+2 business days after order delivery confirmation via Razorpay Route.
            </p>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Transaction History</h2>
          
          {data.transactions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No transactions yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data.transactions.map((txn) => (
                <Card key={txn.id} className="overflow-hidden">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        txn.status === "settled" ? "bg-green-100" : "bg-yellow-100"
                      }`}>
                        {txn.status === "settled" ? (
                          <ArrowDownRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Order #{txn.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {txn.status === "settled" && txn.settledAt
                            ? `Settled ${new Date(txn.settledAt).toLocaleDateString("en-IN")}`
                            : `Created ${new Date(txn.createdAt).toLocaleDateString("en-IN")}`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${txn.status === "settled" ? "text-green-600" : "text-yellow-600"}`}>
                        +₹{txn.amount.toLocaleString("en-IN")}
                      </p>
                      <Badge variant={txn.status === "settled" ? "default" : "secondary"} className="text-[10px]">
                        {txn.status === "settled" ? "Settled" : "Pending"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages || loading}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PayoutsPage() {
  return (
    <ProtectedRoute requiredRole="vendor">
      <ErrorBoundary>
        <PayoutsContent />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}

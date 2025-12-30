"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, MapPin, Bell, Shield, LogOut, Edit, Package, Heart, CreditCard, HelpCircle, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { getSupabaseClient } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import { useToast } from "@/hooks/useToast";

/**
 * Customer Profile Page
 * Swiggy Dec 2025 pattern: Clean profile view with account management
 */
function ProfilePageContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const toast = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error("Supabase client not available");
      }
      
      // Swiggy Dec 2025 pattern: Use Supabase Auth directly, no reinvention
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      logger.info("[Profile] User logged out successfully");
      toast.success("Logged out", "You have been logged out successfully.");
      
      // Redirect to login and refresh
      router.push("/login");
      router.refresh();
    } catch (error) {
      logger.error("[Profile] Logout failed", error);
      toast.error("Logout failed", "Unable to log out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 pb-24 md:pb-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 pb-24 md:pb-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Account</h1>
            <p className="text-muted-foreground mt-1">Manage your account settings</p>
          </div>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{user.name || "Customer"}</h3>
                <Badge variant="secondary" className="mt-1">{user.role}</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push("/profile/edit")}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{user.phone || "Not set"}</p>
                </div>
              </div>

              {user.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => router.push("/orders")}
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-muted-foreground" />
                <span>My Orders</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => router.push("/profile/addresses")}
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <span>Saved Addresses</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => router.push("/profile/favorites")}
            >
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-muted-foreground" />
                <span>Favorites</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Button>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => router.push("/profile/notifications")}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span>Notification Preferences</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => router.push("/profile/payment")}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <span>Payment Methods</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => router.push("/profile/security")}
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <span>Security & Privacy</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Button>
          </CardContent>
        </Card>

        {/* Help & Support */}
        <Card>
          <CardHeader>
            <CardTitle>Help & Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => router.push("/help")}
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-muted-foreground" />
                <span>Help Center</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Button>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <>
                  <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin mr-2" />
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <ProfilePageContent />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}

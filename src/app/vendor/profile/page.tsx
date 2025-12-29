"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, MapPin, Building2, Edit, Clock, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { Badge } from "@/components/ui/badge";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Vendor Profile Page
 * Swiggy Dec 2025 pattern: Clean profile view with edit capability
 */
function VendorProfileContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 pb-24 md:pb-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Profile</h1>
            <p className="text-muted-foreground mt-1">Manage your vendor account</p>
          </div>
          <Button onClick={() => router.push("/vendor/profile/edit")} variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{user.name || "Vendor"}</h3>
                <Badge variant="secondary">{user.role}</Badge>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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

              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Vendor ID</p>
                  <p className="font-medium font-mono text-sm">{user.id}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Business details and verification status will be displayed here.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => router.push("/vendor/profile/business")}>
                Manage Business Details
              </Button>
            </CardContent>
          </Card>

          {/* Operating Hours */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Store Hours
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push("/vendor/profile/hours")}>
                Edit <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm font-medium">{day}</span>
                    <span className="text-sm text-muted-foreground">9:00 AM - 9:00 PM</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push("/vendor/profile/notifications")}>
              Notification Preferences
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push("/vendor/profile/payment")}>
              Payment Settings
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push("/vendor/profile/security")}>
              Security & Password
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VendorProfilePage() {
  return (
    <ProtectedRoute requiredRole="vendor">
      <ErrorBoundary>
        <VendorProfileContent />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}


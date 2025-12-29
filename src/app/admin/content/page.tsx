"use client";

import { useState } from "react";
import { FileText, Image, Settings, Megaphone } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";

/**
 * Admin Content Management Page
 * Swiggy Dec 2025 pattern: Clean content management interface
 */
function AdminContentContent() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Content Management</h1>
          <p className="text-muted-foreground mt-1">Manage platform content and settings</p>
        </div>

        {/* Content Sections */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Megaphone className="w-6 h-6 text-primary" />
                <CardTitle>Banners & Promotions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Manage hero banners, promotional content, and marketing campaigns
              </p>
              <Button variant="outline" className="w-full">
                Manage Banners
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-primary" />
                <CardTitle>Pages & Content</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Edit static pages, terms of service, privacy policy, and help content
              </p>
              <Button variant="outline" className="w-full">
                Manage Pages
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Image className="w-6 h-6 text-primary" />
                <CardTitle>Media Library</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Upload and manage images, videos, and other media assets
              </p>
              <Button variant="outline" className="w-full">
                Manage Media
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-primary" />
                <CardTitle>Platform Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure platform-wide settings, fees, and operational parameters
              </p>
              <Button variant="outline" className="w-full">
                Manage Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Content Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Content management features are being developed. This page will allow you to manage all platform content,
              including banners, static pages, media assets, and platform settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminContentPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <ErrorBoundary>
        <AdminContentContent />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}


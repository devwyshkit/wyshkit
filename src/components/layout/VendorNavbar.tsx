"use client";

import { ArrowLeft, Bell, Menu, Power } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { useNotifications } from "@/contexts/NotificationContext";
import { Switch } from "@/components/ui/switch";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

export function VendorNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [scrolled, setScrolled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(false);

  useEffect(() => {
    // Fetch initial status
    if (user?.role === "vendor") {
      apiClient.get<{ isOnline: boolean }>("/vendor/status")
        .then(res => setIsOnline(res.isOnline))
        .catch(() => {});
    }

    // SSR safety check
    if (typeof window === "undefined") return;
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [user]);

    const toggleStatus = async (checked: boolean) => {
      try {
        setLoadingStatus(true);
        await apiClient.post("/vendor/status", { isOnline: checked });
        setIsOnline(checked);
        toast.success(checked ? "You are now ONLINE" : "You are now OFFLINE");
      } catch (error) {
        toast.error("Failed to update status");
      } finally {
        setLoadingStatus(false);
      }
    };

    // Sound alert for new orders
    useEffect(() => {
      if (user?.role === "vendor") {
        const checkNewOrders = async () => {
          try {
            const res = await apiClient.get<{ pendingAcceptanceCount: number }>("/vendor/dashboard");
            if (res.pendingAcceptanceCount > 0) {
              const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
              audio.play().catch(() => {});
            }
          } catch (error) {}
        };

        const interval = setInterval(checkNewOrders, 30000); // Check every 30s
        checkNewOrders();
        return () => clearInterval(interval);
      }
    }, [user]);

    const isHome = pathname === "/vendor" || pathname.startsWith("/vendor/dashboard");
    const showBack = !isHome && pathname.startsWith("/vendor");

    const getPageTitle = () => {
      if (pathname.startsWith("/vendor/orders")) return "Orders";
      if (pathname.startsWith("/vendor/products")) return "Products";
      if (pathname.startsWith("/vendor/earnings")) return "Earnings";
      if (pathname.startsWith("/vendor/profile")) return "Profile";
      return "Partner Dashboard";
    };

    return (
      <nav
        className={cn(
          "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          scrolled && "shadow-sm"
        )}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Mobile: Back button or Menu */}
            <div className="flex items-center gap-2 md:hidden flex-1">
              {showBack ? (
                <button
                  onClick={() => router.back()}
                  className="p-2.5 -ml-2.5 rounded-lg hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              ) : (
                <button
                  className="p-2.5 -ml-2.5 rounded-lg hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <h1 className="text-sm font-semibold truncate flex-1">
                {getPageTitle()}
              </h1>
              <div className="flex items-center gap-1.5 px-2 py-1 border rounded-full bg-muted/50 ml-auto">
                <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-green-500" : "bg-red-500")} />
                <Switch 
                  checked={isOnline} 
                  onCheckedChange={toggleStatus} 
                  disabled={loadingStatus}
                  className="scale-[0.6] h-4 w-8"
                />
              </div>
            </div>

            {/* Desktop: Logo + Title */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/vendor" className="flex items-center gap-2">
              <span className="text-lg font-bold">WyshKit</span>
              <span className="text-xs text-muted-foreground">Partner</span>
            </Link>
            {!isHome && (
              <span className="text-sm text-muted-foreground">/</span>
            )}
            {!isHome && (
              <span className="text-sm font-medium">{getPageTitle()}</span>
            )}
          </div>

            {/* Right side: Notifications + Profile */}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 border rounded-full bg-muted/50 mr-2">
                <span className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-500" : "bg-red-500")} />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {isOnline ? "Online" : "Offline"}
                </span>
                <Switch 
                  checked={isOnline} 
                  onCheckedChange={toggleStatus} 
                  disabled={loadingStatus}
                  className="scale-75"
                />
              </div>

              <Link
                href="/vendor/notifications"

              className="p-2.5 rounded-lg hover:bg-muted transition-colors relative min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <NotificationBadge count={unreadCount} />}
            </Link>
            {user && (
              <Link
                href="/vendor/profile"
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium">{user.name || "Partner"}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}


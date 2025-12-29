"use client";

import { ArrowLeft, Bell, Menu, BarChart3 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { useNotifications } from "@/contexts/NotificationContext";

export function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // SSR safety check - window is only available in browser
    if (typeof window === "undefined") {
      return;
    }

    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isHome = pathname === "/admin" || pathname.startsWith("/admin/dashboard");
  const showBack = !isHome && pathname.startsWith("/admin");

  const getPageTitle = () => {
    if (pathname.startsWith("/admin/vendors")) return "Vendors";
    if (pathname.startsWith("/admin/orders")) return "Orders";
    if (pathname.startsWith("/admin/analytics")) return "Analytics";
    if (pathname.startsWith("/admin/content")) return "Content";
    return "Admin Dashboard";
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
          <div className="flex items-center gap-2 md:hidden">
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
            <h1 className="text-sm font-semibold truncate flex-1 text-center">
              {getPageTitle()}
            </h1>
          </div>

          {/* Desktop: Logo + Title */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              <span className="text-lg font-bold">WyshKit</span>
              <span className="text-xs text-muted-foreground">Admin</span>
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
            <Link
              href="/admin/notifications"
              className="p-2.5 rounded-lg hover:bg-muted transition-colors relative min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <NotificationBadge count={unreadCount} />}
            </Link>
            {user && (
              <Link
                href="/admin/profile"
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium">{user.name || "Admin"}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}



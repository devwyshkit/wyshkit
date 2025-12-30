import type { Metadata, Viewport } from "next";
import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import { Providers } from "@/components/providers/Providers";
import { LocationProvider } from "@/contexts/LocationContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { DeepLinkHandler } from "@/components/deep-linking/DeepLinkHandler";
import { BrowserExtensionErrorHandler } from "@/components/errors/BrowserExtensionErrorHandler";
// Temporarily removed InitialLoader to test server startup
// import { InitialLoader } from "@/components/providers/InitialLoader";

export const metadata: Metadata = {
  title: "WyshKit | Thoughtful, Artisan-Crafted Personalized Gifts",
  description: "Hyperlocal marketplace for handmade and custom gifting with real-time mockup approval.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WyshKit",
  },
  openGraph: {
    title: "WyshKit | Thoughtful, Artisan-Crafted Personalized Gifts",
    description: "Hyperlocal marketplace for handmade and custom gifting with real-time mockup approval.",
    type: "website",
    locale: "en_IN",
    siteName: "WyshKit",
  },
  twitter: {
    card: "summary_large_image",
    title: "WyshKit | Thoughtful, Artisan-Crafted Personalized Gifts",
    description: "Hyperlocal marketplace for handmade and custom gifting with real-time mockup approval.",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Swiggy Dec 2025 pattern: Removed console suppression - let errors propagate naturally */}
        {/* Note: Chrome extension errors like "Unchecked runtime.lastError: The message port closed before a response was received" 
             are expected and harmless. They occur when browser extensions (ad blockers, password managers, etc.) try to 
             communicate with the page but the message port closes. This is not a bug in our code. */}
      </head>
      <body className="antialiased font-sans">
        <BrowserExtensionErrorHandler />
        <ErrorReporter />
        <ErrorBoundary fallback={<div className="min-h-screen bg-background flex items-center justify-center p-4"><div className="text-center"><h1 className="text-xl font-semibold mb-2">Something went wrong</h1><p className="text-muted-foreground">Please refresh the page</p></div></div>}>
          <ErrorBoundary fallback={<div className="min-h-screen bg-background flex items-center justify-center p-4"><div className="text-center"><h2 className="text-lg font-semibold mb-2">App services unavailable</h2><p className="text-muted-foreground text-sm">Please refresh the page</p></div></div>}>
            <Providers>
              <ErrorBoundary fallback={<div className="min-h-screen bg-background flex items-center justify-center p-4"><div className="text-center"><h2 className="text-lg font-semibold mb-2">Location service unavailable</h2><p className="text-muted-foreground text-sm">Some features may not work</p></div></div>}>
                <LocationProvider>
                  <ErrorBoundary fallback={<div className="min-h-screen bg-background flex items-center justify-center p-4"><div className="text-center"><h2 className="text-lg font-semibold mb-2">Notification service unavailable</h2><p className="text-muted-foreground text-sm">Some features may not work</p></div></div>}>
                    <NotificationProvider>
                      <DeepLinkHandler />
                      {children}
                    </NotificationProvider>
                  </ErrorBoundary>
                </LocationProvider>
              </ErrorBoundary>
            </Providers>
          </ErrorBoundary>
        </ErrorBoundary>
        <VisualEditsMessenger />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import { Providers } from "@/components/providers/Providers";
import { LocationProvider } from "@/contexts/LocationContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { DeepLinkHandler } from "@/components/deep-linking/DeepLinkHandler";

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
      <body className="antialiased font-sans">
        <ErrorReporter />
        <ErrorBoundary fallback={<div className="min-h-screen bg-background flex items-center justify-center p-4"><div className="text-center"><h1 className="text-xl font-semibold mb-2">Something went wrong</h1><p className="text-muted-foreground">Please refresh the page</p></div></div>}>
          <Providers>
            <LocationProvider>
              <NotificationProvider>
                <DeepLinkHandler />
                {children}
              </NotificationProvider>
            </LocationProvider>
          </Providers>
        </ErrorBoundary>
        <VisualEditsMessenger />
      </body>
    </html>
  );
}

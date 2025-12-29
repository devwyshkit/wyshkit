"use client";

import { VendorNavbar } from "@/components/layout/VendorNavbar";
import { VendorBottomNav } from "@/components/layout/VendorBottomNav";

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <VendorNavbar />
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <VendorBottomNav />
    </>
  );
}


"use client";

import { AdminNavbar } from "@/components/layout/AdminNavbar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminNavbar />
      <main className="flex-1">
        {children}
      </main>
    </>
  );
}


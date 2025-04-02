/* /app/protected/layout.jsx */
import React from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import "@/app/globals.css"; // to ensure Tailwind is included

export default async function ProtectedLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="h-screen w-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-100 border-r border-gray-300 p-4">
        <h2 className="text-lg font-semibold mb-4">Protected Menu</h2>
        <nav>
          <ul className="space-y-2">
            <li>
              <Link href="/protected/unibox" className="text-blue-600 hover:underline">
                Unibox
              </Link>
            </li>
            <li>
              <Link href="/protected/campaigns" className="text-blue-600 hover:underline">
                Campaigns
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">{children}</main>
    </div>
  );
}

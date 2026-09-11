"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOutAction } from "@/app/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AppNav({ active }: { active?: "dashboard" | "communities" | "library" | "requests" | "loans" | "notifications" | "profile" }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const links = [
    ["dashboard", "Home", "/dashboard"],
    ["communities", "Communities", "/communities"],
    ["library", "My library", "/library"],
    ["requests", "Requests", "/requests"],
    ["loans", "Loans", "/loans"],
    ["notifications", "Notifications", "/notifications"],
    ["profile", "Profile", "/profile"],
  ] as const;
  const currentSection = pathname.startsWith("/loans")
    ? "loans"
    : pathname.startsWith("/notifications")
      ? "notifications"
    : pathname.startsWith("/requests")
      ? "requests"
      : pathname.startsWith("/library")
        ? "library"
        : pathname.startsWith("/communities") || pathname.startsWith("/books/")
          ? "communities"
          : pathname.startsWith("/profile")
            ? "profile"
            : active ?? "dashboard";

  useEffect(() => {
    let mounted = true;

    async function loadUnreadCount() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);
      if (mounted) setUnreadCount(count ?? 0);
    }

    loadUnreadCount().catch(() => {
      if (mounted) setUnreadCount(0);
    });
    return () => {
      mounted = false;
    };
  }, [pathname]);

  return (
    <nav className="flex flex-col gap-5 border-b border-[var(--forest)]/15 pb-5 sm:flex-row sm:items-center sm:justify-between" aria-label="Bookmuni navigation">
      <div><Link href="/dashboard" className="font-display text-xl font-bold tracking-tight">bookmuni<span className="text-[var(--apricot)]">.</span></Link><p className="mt-1 text-xs text-[var(--ink-muted)]">A trusted shelf, close to home.</p></div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold">
        {links.map(([key, label, href]) => <Link key={key} href={href} aria-current={currentSection === key ? "page" : undefined} className={currentSection === key ? "app-nav-link app-nav-link-active" : "app-nav-link"}>{label}{key === "notifications" && unreadCount > 0 && <span aria-label={`${unreadCount} unread notifications`} className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}</Link>)}
        <form action={signOutAction}><button className="text-[var(--ink-muted)] hover:text-[var(--forest)]">Sign out</button></form>
      </div>
    </nav>
  );
}
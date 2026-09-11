import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { markAllNotificationsReadAction, markNotificationReadAction } from "./actions";

type Notification = { id: string; type: string; title: string; body: string; request_id: string | null; loan_id: string | null; read_at: string | null; created_at: string };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/auth");
  const { data: notifications, error } = await supabase.from("notifications").select("id, type, title, body, request_id, loan_id, read_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  const { error: actionError } = await searchParams;
  const unreadCount = (notifications ?? []).filter((notification) => !notification.read_at).length;

  return <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16"><div className="mx-auto max-w-5xl"><AppNav active="notifications" /><div className="mt-14 flex flex-wrap items-end justify-between gap-5"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--apricot)]">Your updates</p><h1 className="mt-4 font-display text-5xl leading-tight">Notifications.</h1><p className="mt-5 text-lg leading-8 text-[var(--ink-muted)]">Requests, pickups, due dates, and returns in one place.</p></div>{unreadCount > 0 && <form action={markAllNotificationsReadAction}><button className="rounded-xl border px-4 py-3 text-sm font-bold">Mark all read</button></form>}</div>{(error || actionError) && <p role="alert" className="mt-8 rounded-xl bg-[#f7d7c2] p-4 text-sm">{error?.message ?? actionError}</p>}<div className="mt-10 space-y-3">{!error && notifications?.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-[var(--ink-muted)]">You have no notifications yet.</div>}{(notifications as Notification[] | null)?.map((notification) => <article key={notification.id} className={`rounded-2xl border p-5 ${notification.read_at ? "bg-[var(--paper)]" : "bg-[var(--leaf)]/60"}`}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-[var(--apricot)]">{notification.type.replaceAll("_", " ")}</p><h2 className="mt-2 font-display text-xl">{notification.title}</h2><p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{notification.body}</p><p className="mt-3 text-xs text-[var(--ink-muted)]">{new Date(notification.created_at).toLocaleString()}</p></div>{!notification.read_at && <form action={markNotificationReadAction}><input type="hidden" name="notificationId" value={notification.id} /><button className="whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-bold">Mark read</button></form>}</div>{notification.loan_id && <Link href={`/loans/${notification.loan_id}`} className="mt-4 inline-block text-sm font-bold text-[var(--forest)]">Open loan -&gt;</Link>}{notification.request_id && <Link href="/requests" className="mt-4 inline-block text-sm font-bold text-[var(--forest)]">Open request -&gt;</Link>}</article>)}</div></div></main>;
}
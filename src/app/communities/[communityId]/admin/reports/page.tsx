import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveReportAction } from "@/app/moderation/actions";

type Report = { id: string; target_type: string; reason: string; details: string | null; status: string; created_at: string };

export default async function CommunityReportsPage({ params, searchParams }: { params: Promise<{ communityId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { communityId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/auth");
  const { data: membership } = await supabase.from("community_memberships").select("status, role").eq("community_id", communityId).eq("user_id", user.id).maybeSingle();
  if (membership?.status !== "approved" || membership.role !== "admin") redirect(`/communities/${communityId}`);
  const [{ data: community }, { data: reports }] = await Promise.all([
    supabase.from("communities").select("name").eq("id", communityId).maybeSingle(),
    supabase.from("reports").select("id, target_type, reason, details, status, created_at").eq("community_id", communityId).order("created_at", { ascending: false }),
  ]);
  const { error } = await searchParams;
  const rows = (reports ?? []) as Report[];

  return <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16"><div className="mx-auto max-w-5xl"><AppNav active="communities" /><div className="mt-14"><Link href={`/communities/${communityId}/admin`} className="text-sm font-semibold text-[var(--forest)]">&lt;- Admin settings</Link><p className="mt-7 text-sm font-bold uppercase tracking-[0.18em] text-[var(--apricot)]">Moderation</p><h1 className="mt-4 font-display text-5xl leading-tight">{community?.name} reports.</h1>{error && <p role="alert" className="mt-6 rounded-xl bg-[#f7d7c2] p-4 text-sm">{error}</p>}<div className="mt-10 space-y-4">{rows.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-[var(--ink-muted)]">No reports for this community.</div>}{rows.map((report) => <article key={report.id} className="rounded-2xl border bg-[var(--paper)] p-5"><div className="flex flex-wrap justify-between gap-3"><span className="text-xs font-bold uppercase text-[var(--apricot)]">{report.target_type}</span><span className="text-xs font-bold uppercase text-[var(--forest)]">{report.status}</span></div><h2 className="mt-3 font-display text-xl">{report.reason}</h2>{report.details && <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{report.details}</p>}<p className="mt-3 text-xs text-[var(--ink-muted)]">{new Date(report.created_at).toLocaleString()}</p>{report.status === "open" || report.status === "reviewing" ? <div className="mt-5 flex gap-2"><form action={resolveReportAction}><input type="hidden" name="reportId" value={report.id} /><input type="hidden" name="status" value="reviewing" /><button className="rounded-lg border px-3 py-2 text-xs font-bold">Mark reviewing</button></form><form action={resolveReportAction}><input type="hidden" name="reportId" value={report.id} /><input type="hidden" name="status" value="resolved" /><button className="rounded-lg bg-[var(--forest)] px-3 py-2 text-xs font-bold text-white">Resolve</button></form><form action={resolveReportAction}><input type="hidden" name="reportId" value={report.id} /><input type="hidden" name="status" value="dismissed" /><button className="rounded-lg border px-3 py-2 text-xs font-bold">Dismiss</button></form></div> : null}</article>)}</div></div></div></main>;
}
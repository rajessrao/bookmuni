import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { JoinCommunityForm } from "./community-forms";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Membership = { community_id: string; status: string; role: string; communities: { id: string; name: string; locality: string } | null };

export default async function CommunitiesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/auth");

  const { data } = await supabase.from("community_memberships").select("community_id, status, role, communities(id, name, locality)").eq("user_id", user.id).order("created_at", { ascending: false });
  const memberships = (data ?? []) as unknown as Membership[];
  const { error } = await searchParams;

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <AppNav active="communities" />
        <div className="mt-16 max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--apricot)]">Your circles</p><h1 className="mt-4 font-display text-5xl leading-tight">Where your books belong.</h1><p className="mt-5 text-lg leading-8 text-[var(--ink-muted)]">Join a trusted local shelf or start one for your community. Approved members can browse local copies, request a book, and meet at a shared pickup point.</p></div>
        {error && <p role="alert" className="mt-8 rounded-xl bg-[#f7d7c2] px-4 py-3 text-sm leading-6">{error}</p>}
        <section className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div><h2 className="font-display text-2xl">Your communities</h2><div className="mt-5 space-y-3">{memberships.length === 0 && <div className="rounded-2xl border border-dashed p-6 text-[var(--ink-muted)]">You have not joined a community yet.</div>}{memberships.map((membership) => membership.communities && <Link key={membership.community_id} href={`/communities/${membership.community_id}/books`} className="flex items-center justify-between rounded-2xl border bg-[var(--paper)] p-5 transition hover:-translate-y-0.5 hover:shadow-lg"><span><strong className="block text-lg">{membership.communities.name}</strong><span className="text-sm text-[var(--ink-muted)]">{membership.communities.locality}</span></span><span className="text-right text-xs font-bold uppercase tracking-wider text-[var(--forest)]">{membership.status}</span></Link>)}</div></div>
          <div className="rounded-2xl bg-[var(--leaf)]/60 p-6"><h2 className="font-display text-2xl">Have an invitation?</h2><p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">Enter the private code shared by your community admin. Your request will wait for approval before its books become visible.</p><JoinCommunityForm /></div>
        </section>
        <div className="mt-10"><Link href="/communities/new" className="font-semibold text-[var(--forest)] underline decoration-[var(--apricot)] decoration-2 underline-offset-4">Create a community</Link></div>
      </div>
    </main>
  );
}
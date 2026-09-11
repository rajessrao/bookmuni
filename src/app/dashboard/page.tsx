import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/auth");

  const [{ data: profile }, { data: memberships }, { data: copies }] = await Promise.all([
    supabase.from("profiles").select("display_name, locality").eq("id", user.id).maybeSingle(),
    supabase.from("community_memberships").select("status, communities(id, name, locality)").eq("user_id", user.id).eq("status", "approved"),
    supabase.from("physical_copies").select("id, title, author, availability").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(3),
  ]);
  const approvedCommunities = (memberships ?? []).flatMap((membership) => {
    const relation = (membership as { communities?: { id: string; name: string; locality: string } | { id: string; name: string; locality: string }[] | null }).communities;
    return relation ? (Array.isArray(relation) ? relation : [relation]) : [];
  });

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <AppNav active="dashboard" />
        <section className="mt-14 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--apricot)]">Your Bookmuni</p><h1 className="mt-4 font-display text-5xl leading-tight sm:text-6xl">Good to see you, {profile?.display_name ?? "reader"}.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-[var(--ink-muted)]">Keep your shelf moving through the communities you trust.</p></div>
          <Link href="/library/new" className="inline-flex w-fit rounded-xl bg-[var(--forest)] px-5 py-3 font-bold text-white transition hover:bg-[#163d35]">Add a book</Link>
        </section>
        <section className="mt-12 grid gap-5 md:grid-cols-3">
          <Link href="/communities" className="rounded-2xl bg-[var(--leaf)]/70 p-6 transition hover:-translate-y-0.5"><p className="text-sm text-[var(--ink-muted)]">Approved communities</p><p className="mt-3 font-display text-4xl">{memberships?.length ?? 0}</p><p className="mt-5 text-sm font-bold text-[var(--forest)]">Open communities -&gt;</p></Link>
          <Link href="/library" className="rounded-2xl bg-[var(--paper)] p-6 shadow-sm transition hover:-translate-y-0.5"><p className="text-sm text-[var(--ink-muted)]">Books on your shelf</p><p className="mt-3 font-display text-4xl">{copies?.length ?? 0}</p><p className="mt-5 text-sm font-bold text-[var(--forest)]">Manage library -&gt;</p></Link>
          <Link href="/loans" className="rounded-2xl bg-[#f0dfc3] p-6 transition hover:-translate-y-0.5"><p className="text-sm text-[var(--ink-muted)]">Your loans</p><p className="mt-3 font-display text-2xl">Track lending</p><p className="mt-5 text-sm font-bold text-[var(--forest)]">Open loans -&gt;</p></Link>
        </section>
        <section className="mt-12 grid gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div><div className="flex items-center justify-between"><h2 className="font-display text-2xl">Recent shelf additions</h2><Link href="/library" className="text-sm font-bold text-[var(--forest)]">View all</Link></div><div className="mt-5 space-y-3">{copies?.length ? copies.map((copy) => <Link key={copy.id} href="/library" className="flex items-center justify-between rounded-xl border bg-[var(--paper)] p-4"><span><strong className="block">{copy.title}</strong><span className="text-sm text-[var(--ink-muted)]">{copy.author}</span></span><span className="text-xs font-bold uppercase text-[var(--forest)]">{copy.availability}</span></Link>) : <div className="rounded-xl border border-dashed p-6 text-[var(--ink-muted)]">Your shelf is waiting for its first book.</div>}</div></div>
          <div><h2 className="font-display text-2xl">Your circles</h2><div className="mt-5 space-y-3">{approvedCommunities.length ? approvedCommunities.map((community) => <Link key={community.id} href={`/communities/${community.id}/books`} className="block rounded-xl border bg-[var(--paper)] p-4"><strong className="block">{community.name}</strong><span className="text-sm text-[var(--ink-muted)]">{community.locality}</span></Link>) : <div className="rounded-xl border border-dashed p-6 text-[var(--ink-muted)]">Join a community to start sharing.</div>}</div></div>
        </section>
      </div>
    </main>
  );
}
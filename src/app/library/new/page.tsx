import Link from "next/link";
import { redirect } from "next/navigation";
import { BookForm } from "../book-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Community = { id: string; name: string; locality: string };

export default async function NewBookPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/auth");
  const { data } = await supabase.from("community_memberships").select("community_id, communities(id, name, locality)").eq("user_id", user.id).eq("status", "approved");
  const communities = (data ?? []).map((row) => row.communities).filter(Boolean) as unknown as Community[];
  const { error } = await searchParams;

  return <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16"><div className="mx-auto max-w-3xl"><Link href="/library" className="font-display text-xl font-bold">bookmuni<span className="text-[var(--apricot)]">.</span></Link><div className="mt-16"><p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--apricot)]">Your shelf</p><h1 className="mt-4 font-display text-5xl leading-tight">Add a physical book.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--ink-muted)]">ISBN lookup can fill bibliographic details, but you stay in control of the final copy information.</p>{error && <p role="alert" className="mt-8 rounded-xl bg-[#f7d7c2] px-4 py-3 text-sm leading-6">{error}</p>}<BookForm communities={communities} /></div></div></main>;
}
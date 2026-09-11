import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateCommunityForm } from "../community-forms";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NewCommunityPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/auth");
  const { error } = await searchParams;

  return <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16"><div className="mx-auto max-w-2xl"><Link href="/communities" className="font-display text-xl font-bold">bookmuni<span className="text-[var(--apricot)]">.</span></Link><div className="mt-16"><p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--apricot)]">New circle</p><h1 className="mt-4 font-display text-5xl leading-tight">Start a community shelf.</h1><p className="mt-5 leading-7 text-[var(--ink-muted)]">You will become its first admin. Keep the invitation code private and share it only with trusted members.</p>{error && <p role="alert" className="mt-8 rounded-xl bg-[#f7d7c2] px-4 py-3 text-sm leading-6">{error}</p>}<CreateCommunityForm /></div></div></main>;
}
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Loan = { id: string; status: string; due_at: string | null; borrower_id: string; lender_id: string; physical_copies: { title: string; author: string } | null };

export default async function LoansPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/auth");
  const { data, error } = await supabase.from("loans").select("id, status, due_at, borrower_id, lender_id, physical_copies(title, author)").or(`borrower_id.eq.${user.id},lender_id.eq.${user.id}`).order("created_at", { ascending: false });
  const loans = (data ?? []) as unknown as Loan[];

  return <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16"><div className="mx-auto max-w-5xl"><AppNav active="requests" /><div className="mt-14"><p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--apricot)]">Loan history</p><h1 className="mt-4 font-display text-5xl leading-tight">Books in motion.</h1><p className="mt-5 text-lg leading-8 text-[var(--ink-muted)]">Track pickup, due dates, return, and closure in one place.</p>{error && <p role="alert" className="mt-8 rounded-xl bg-[#f7d7c2] p-4 text-sm">Could not load loans: {error.message}</p>}<div className="mt-10 space-y-3">{!error && loans.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-[var(--ink-muted)]">No approved loans yet.</div>}{loans.map((loan) => <Link key={loan.id} href={`/loans/${loan.id}`} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-[var(--paper)] p-5 transition hover:-translate-y-0.5 hover:shadow-lg"><span><strong className="block text-lg">{loan.physical_copies?.title ?? "Book"}</strong><span className="text-sm text-[var(--ink-muted)]">{loan.physical_copies?.author} · {loan.borrower_id === user.id ? "Borrowed" : "Lent"}</span></span><span className="text-right"><strong className="block text-xs uppercase tracking-wider text-[var(--forest)]">{loan.status}</strong>{loan.due_at && <span className="text-xs text-[var(--ink-muted)]">Due {new Date(loan.due_at).toLocaleDateString()}</span>}</span></Link>)}</div></div></div></main>;
}
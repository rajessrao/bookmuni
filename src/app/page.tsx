import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(user && !user.is_anonymous);

  return (
    <main className="min-h-screen overflow-hidden">
      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-7 sm:px-10 lg:px-16">
        <nav className="flex items-center justify-between" aria-label="Main navigation">
          <Link href="/" className="font-display text-xl font-bold tracking-tight">bookmuni<span className="text-[var(--apricot)]">.</span></Link>
          {isAuthenticated ? (
            <Link href="/dashboard" className="rounded-full border border-[var(--forest)]/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-[var(--leaf)]">Open Bookmuni</Link>
          ) : (
            <Link href="/auth" className="rounded-full border border-[var(--forest)]/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-[var(--leaf)]">Sign in</Link>
          )}
        </nav>
        <div className="grid flex-1 items-center gap-14 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-24">
          <div className="max-w-2xl">
            <p className="mb-6 text-sm font-bold uppercase tracking-[0.2em] text-[var(--apricot)]">A little library, close to home</p>
            <h1 className="font-display text-5xl leading-[1.08] tracking-tight sm:text-7xl">Let your books <span className="italic text-[var(--forest)]">travel</span> farther.</h1>
            <p className="mt-8 max-w-lg text-lg leading-8 text-[var(--ink-muted)]">Bookmuni helps trusted local communities lend and borrow the physical books already on their shelves. Keep circulation close, transparent, and rooted in people you know.</p>
            {isAuthenticated ? (
              <Link href="/dashboard" className="mt-10 inline-flex items-center rounded-full bg-[var(--forest)] px-6 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#163d35]">Open your dashboard <span className="ml-3 text-lg">-&gt;</span></Link>
            ) : (
              <Link href="/auth" className="mt-10 inline-flex items-center rounded-full bg-[var(--forest)] px-6 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#163d35]">Join your community <span className="ml-3 text-lg">-&gt;</span></Link>
            )}
          </div>
          <div className="relative mx-auto w-full max-w-md lg:mr-8">
            <div className="absolute -inset-8 rounded-[45%] bg-[var(--leaf)]/70 blur-2xl" aria-hidden="true" />
            <div className="relative rotate-[-4deg] rounded-[2rem] bg-[var(--forest)] p-5 shadow-2xl shadow-[var(--forest)]/20">
              <div className="rounded-[1.5rem] border border-white/20 bg-[#f0dfc3] p-8 pb-12 text-[var(--forest)]">
                <p className="text-xs font-bold uppercase tracking-[0.18em]">Currently circulating</p>
                <div className="mt-20 font-display text-4xl leading-tight">A shelf is a story waiting to be shared.</div>
                <div className="mt-16 flex items-end justify-between border-t border-[var(--forest)]/20 pt-4 text-xs font-semibold"><span>Page Turner Troopers</span><span>01 / 04</span></div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 rotate-[7deg] rounded-2xl bg-[var(--apricot)] px-5 py-4 text-sm font-bold text-[var(--forest)] shadow-lg">40 books nearby</div>
          </div>
        </div>
        <div className="grid gap-6 border-t border-[var(--forest)]/15 pt-6 text-sm text-[var(--ink-muted)] sm:grid-cols-3"><div><strong className="block text-[var(--foreground)]">Share locally</strong><span className="mt-1 block">Choose exactly which communities can see each copy.</span></div><div><strong className="block text-[var(--foreground)]">Borrow thoughtfully</strong><span className="mt-1 block">Every request is approved by the person lending the book.</span></div><div><strong className="block text-[var(--foreground)]">Return clearly</strong><span className="mt-1 block">Pickup, due dates, and return confirmations keep books moving.</span></div></div>
      </section>
    </main>
  );
}

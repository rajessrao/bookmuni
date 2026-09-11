import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function AuthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-xl font-bold">bookmuni<span className="text-[var(--apricot)]">.</span></Link>
        <div className="mt-12 rounded-[2rem] border border-[var(--forest)]/10 bg-[var(--paper)] p-7 shadow-xl shadow-[var(--forest)]/5 sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--apricot)]">Your local shelf</p>
          <h1 className="mt-4 font-display text-4xl leading-tight">Come on in.</h1>
          <p className="mt-4 leading-7 text-[var(--ink-muted)]">Sign in with your email. We&apos;ll send a one-time code, no password to remember.</p>
          <AuthForm />
        </div>
      </div>
    </main>
  );
}
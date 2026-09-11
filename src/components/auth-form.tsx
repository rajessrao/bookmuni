"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordMode, setPasswordMode] = useState(false);
  const devPasswordLoginEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_PASSWORD_LOGIN === "true";

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const request = createSupabaseBrowserClient().auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true },
      });
      const timeout = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("Supabase took too long to respond. Check your SMTP settings and try again.")), 15000);
      });
      const { error } = await Promise.race([request, timeout]);

      if (error) {
        setMessage(error.message.includes("504") ? "Email delivery timed out. Check Supabase SMTP settings and try again." : error.message);
        return;
      }

      setSent(true);
      setMessage("Your six-digit code is on its way.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const { error } = await createSupabaseBrowserClient().auth.verifyOtp({ email, token, type: "email" });
    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const { error } = await createSupabaseBrowserClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password: token });
      if (error) {
        setMessage(error.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8">
      {passwordMode ? (
        <form onSubmit={signInWithPassword} className="space-y-4">
          <label className="block text-sm font-semibold" htmlFor="dev-email">Test user email</label>
          <input id="dev-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="reader.one@bookmuni.local" className="w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" />
          <label className="block text-sm font-semibold" htmlFor="dev-password">Test password</label>
          <input id="dev-password" type="password" required value={token} onChange={(event) => setToken(event.target.value)} placeholder="BookmuniTest123!" className="w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" />
          <button disabled={busy} className="w-full rounded-xl bg-[var(--forest)] px-4 py-3.5 font-bold text-white disabled:opacity-60">{busy ? "Signing in..." : "Sign in as test user"}</button>
          <button type="button" onClick={() => setPasswordMode(false)} className="w-full py-2 text-sm font-semibold text-[var(--ink-muted)]">Back to email code</button>
        </form>
      ) : !sent ? (
        <form onSubmit={requestCode} className="space-y-4">
          <label className="block text-sm font-semibold" htmlFor="email">Email address</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border bg-white px-4 py-3 outline-none transition placeholder:text-[var(--ink-muted)]/60 focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" />
          <button disabled={busy} className="w-full rounded-xl bg-[var(--forest)] px-4 py-3.5 font-bold text-white transition hover:bg-[#163d35] disabled:cursor-wait disabled:opacity-60">{busy ? "Sending code..." : "Send me a code"}</button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-4">
          <label className="block text-sm font-semibold" htmlFor="token">Six-digit code</label>
          <input id="token" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code" value={token} onChange={(event) => setToken(event.target.value)} placeholder="000000" className="w-full rounded-xl border bg-white px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none transition focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" />
          <button disabled={busy} className="w-full rounded-xl bg-[var(--forest)] px-4 py-3.5 font-bold text-white transition hover:bg-[#163d35] disabled:cursor-wait disabled:opacity-60">{busy ? "Checking code..." : "Enter Bookmuni"}</button>
          <button type="button" onClick={() => setSent(false)} className="w-full py-2 text-sm font-semibold text-[var(--ink-muted)] hover:text-[var(--forest)]">Use a different email</button>
        </form>
      )}
      {devPasswordLoginEnabled && !passwordMode && <button type="button" onClick={() => setPasswordMode(true)} className="mt-5 w-full text-sm font-semibold text-[var(--ink-muted)] hover:text-[var(--forest)]">Use a local test account</button>}
      {message && <p role="status" className="mt-5 rounded-xl bg-[var(--leaf)]/60 px-4 py-3 text-sm leading-6">{message}</p>}
    </div>
  );
}
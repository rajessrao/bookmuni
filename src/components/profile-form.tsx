"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Profile = { display_name: string; locality: string | null; avatar_path: string | null } | null;

export function ProfileForm({ email, initialProfile }: { email: string; initialProfile: Profile }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialProfile?.display_name ?? "");
  const [locality, setLocality] = useState(initialProfile?.locality ?? "");
  const [profileEmail, setProfileEmail] = useState(email);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || !active) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, locality")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      setProfileEmail(user.email ?? email);
      if (profile) {
        setDisplayName(profile.display_name);
        setLocality(profile.locality ?? "");
      }
    }

    loadProfile().catch(() => {
      // Keep the form usable with its initial values if the profile lookup fails.
    });

    return () => {
      active = false;
    };
  }, [email]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Your session has expired. Please sign in again.");
        return;
      }

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: displayName.trim(),
        locality: locality.trim() || null,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        setMessage(`Could not save your profile: ${error.message}`);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save your profile. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={saveProfile} className="mt-10 space-y-5">
      <div><label className="block text-sm font-semibold" htmlFor="displayName">Name</label><input id="displayName" required minLength={2} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="What should people call you?" className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none transition focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /></div>
      <div><label className="block text-sm font-semibold" htmlFor="profile-email">Email</label><input id="profile-email" value={profileEmail} readOnly className="mt-2 w-full rounded-xl border bg-[var(--leaf)]/30 px-4 py-3 text-[var(--ink-muted)]" /></div>
      <div><label className="block text-sm font-semibold" htmlFor="locality">Locality <span className="font-normal text-[var(--ink-muted)]">(optional)</span></label><input id="locality" value={locality} onChange={(event) => setLocality(event.target.value)} placeholder="For example, Patancheru" className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none transition focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /></div>
      <button disabled={busy} className="rounded-xl bg-[var(--forest)] px-6 py-3.5 font-bold text-white transition hover:bg-[#163d35] disabled:opacity-60">{busy ? "Saving..." : "Save profile"}</button>
      {message && <p role="status" className="rounded-xl bg-[var(--leaf)]/60 px-4 py-3 text-sm leading-6">{message}</p>}
    </form>
  );
}
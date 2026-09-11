import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { ProfileForm } from "@/components/profile-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.is_anonymous) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, locality, avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <AppNav active="profile" />
        <div className="mt-16 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--apricot)]">Your profile</p>
          <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">Tell your community who you are.</h1>
          <p className="mt-5 leading-7 text-[var(--ink-muted)]">Use a first name or nickname. Keep your exact address private; your community only needs a general locality.</p>
          <ProfileForm email={user.email ?? ""} initialProfile={profile} />
        </div>
      </div>
    </main>
  );
}
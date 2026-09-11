import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { approveMembershipAction, rejectMembershipAction } from "../actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Member = { user_id: string; status: string; role: string; profiles: { display_name: string; locality: string | null } | null };
type PendingMember = { user_id: string; status: string; role: string; display_name: string; locality: string | null; created_at: string };

export default async function CommunityPage({ params, searchParams }: { params: Promise<{ communityId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { communityId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/auth");

  const { data: community } = await supabase.from("communities").select("id, name, description, locality, rules").eq("id", communityId).maybeSingle();
  if (!community) notFound();
  const { data: membership } = await supabase.from("community_memberships").select("status, role").eq("community_id", communityId).eq("user_id", user.id).maybeSingle();
  if (membership?.status !== "approved" && membership?.status !== "pending") redirect("/communities");

  const [{ data: members, error: membersError }, { data: pendingMembers, error: pendingError }, { data: pickupLocations }] = await Promise.all([
    supabase.from("community_memberships").select("user_id, status, role, profiles!community_memberships_user_id_fkey(display_name, locality)").eq("community_id", communityId).order("created_at"),
    supabase.rpc("get_pending_community_members", { target_community_id: communityId }),
    supabase.from("community_pickup_locations").select("name, description").eq("community_id", communityId).eq("is_active", true),
  ]);
  const memberRows = (members ?? []) as unknown as Member[];
  const pendingRows = (pendingMembers ?? []) as PendingMember[];
  const { error: queryError } = await searchParams;
  const dataError = membersError ?? pendingError;
  const isAdmin = membership.role === "admin" && membership.status === "approved";

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <AppNav active="communities" />
        <div className="mt-16 max-w-3xl">
          <Link href={`/communities/${communityId}/books`} className="text-sm font-semibold text-[var(--forest)]">Browse books -&gt;</Link>
          {isAdmin && <Link href={`/communities/${communityId}/admin`} className="ml-5 text-sm font-semibold text-[var(--forest)]">Admin settings -&gt;</Link>}
          <p className="mt-7 text-sm font-bold uppercase tracking-[0.18em] text-[var(--apricot)]">Private community</p>
          <h1 className="mt-4 font-display text-5xl leading-tight">{community.name}</h1>
          <p className="mt-3 text-lg text-[var(--ink-muted)]">{community.locality}</p>
          {community.description && <p className="mt-6 max-w-2xl text-lg leading-8">{community.description}</p>}
          {membership.status === "pending" && <p className="mt-8 rounded-xl bg-[var(--leaf)]/70 px-4 py-3 text-sm">Your membership request is waiting for admin approval.</p>}
          {(queryError || dataError) && <p role="alert" className="mt-8 rounded-xl bg-[#f7d7c2] px-4 py-3 text-sm">{queryError ?? dataError?.message}</p>}
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl bg-[var(--paper)] p-6"><h2 className="font-display text-2xl">Community notes</h2><p className="mt-4 whitespace-pre-wrap leading-7 text-[var(--ink-muted)]">{community.rules || "This community has not added rules yet."}</p><div className="mt-8 border-t pt-5"><h3 className="font-semibold">Pickup locations</h3>{pickupLocations?.map((location) => <p key={location.name} className="mt-3 text-sm"><strong>{location.name}</strong>{location.description && <span className="block text-[var(--ink-muted)]">{location.description}</span>}</p>)}</div></section>
          <section className="rounded-2xl bg-[var(--leaf)]/60 p-6"><h2 className="font-display text-2xl">Members</h2><p className="mt-2 text-sm text-[var(--ink-muted)]">{memberRows.filter((member) => member.status === "approved").length} approved members</p><div className="mt-5 space-y-3">{memberRows.filter((member) => member.status === "approved").map((member) => <div key={member.user_id} className="flex items-center justify-between border-b border-[var(--forest)]/10 pb-3 text-sm"><span><strong className="block">{member.profiles?.display_name ?? "Member"}</strong><span className="text-[var(--ink-muted)]">{member.profiles?.locality ?? "Local member"}</span></span><span className="text-xs font-bold uppercase">{member.role}</span></div>)}</div></section>
        </div>
        {isAdmin && <section className="mt-8 rounded-2xl border p-6"><h2 className="font-display text-2xl">Pending approvals</h2>{pendingRows.length === 0 ? <p className="mt-3 text-sm text-[var(--ink-muted)]">No membership requests waiting.</p> : <div className="mt-5 space-y-3">{pendingRows.map((member) => <div key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3"><span><strong className="block text-sm">{member.display_name || "New member"}</strong><span className="text-xs text-[var(--ink-muted)]">{member.locality ?? "Locality not shared"}</span></span><div className="flex gap-2"><form action={approveMembershipAction}><input type="hidden" name="communityId" value={communityId} /><input type="hidden" name="memberId" value={member.user_id} /><button className="rounded-lg bg-[var(--forest)] px-3 py-2 text-xs font-bold text-white">Approve</button></form><form action={rejectMembershipAction}><input type="hidden" name="communityId" value={communityId} /><input type="hidden" name="memberId" value={member.user_id} /><button className="rounded-lg border px-3 py-2 text-xs font-bold">Reject</button></form></div></div>)}</div>}</section>}
      </div>
    </main>
  );
}

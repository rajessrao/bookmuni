import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addPickupLocationAction, removeMemberAction, removePickupLocationAction, rotateInvitationAction, updateCommunityAdminAction } from "../../actions";

type Member = { user_id: string; status: string; role: string; profiles: { display_name: string; locality: string | null } | null };

type PickupLocation = { id: string; name: string; description: string | null };

export default async function CommunityAdminPage({ params, searchParams }: { params: Promise<{ communityId: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { communityId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/auth");

  const { data: membership } = await supabase.from("community_memberships").select("status, role").eq("community_id", communityId).eq("user_id", user.id).maybeSingle();
  if (membership?.status !== "approved" || membership.role !== "admin") redirect(`/communities/${communityId}`);

  const [{ data: community }, { data: members }, { data: locations }] = await Promise.all([
    supabase.from("communities").select("id, name, description, locality, rules").eq("id", communityId).maybeSingle(),
    supabase.from("community_memberships").select("user_id, status, role, profiles!community_memberships_user_id_fkey(display_name, locality)").eq("community_id", communityId).order("created_at"),
    supabase.from("community_pickup_locations").select("id, name, description").eq("community_id", communityId).eq("is_active", true),
  ]);
  if (!community) redirect("/communities");

  const memberRows = (members ?? []) as unknown as Member[];
  const pickupLocations = (locations ?? []) as PickupLocation[];
  const { error, saved } = await searchParams;

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <AppNav active="communities" />
        <div className="mt-14">
          <Link href={`/communities/${communityId}`} className="text-sm font-semibold text-[var(--forest)]">&lt;- Community</Link><Link href={`/communities/${communityId}/admin/reports`} className="ml-5 text-sm font-semibold text-[var(--forest)]">Review reports -&gt;</Link>
          <p className="mt-7 text-sm font-bold uppercase tracking-[0.18em] text-[var(--apricot)]">Admin settings</p>
          <h1 className="mt-4 font-display text-5xl leading-tight">Manage {community.name}.</h1>
          <p className="mt-4 text-lg text-[var(--ink-muted)]">Community controls are scoped to this community.</p>
          {(error || saved) && <p role="status" className="mt-6 rounded-xl bg-[var(--leaf)]/70 p-4 text-sm">{error ?? "Changes saved."}</p>}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <form action={updateCommunityAdminAction} className="rounded-2xl bg-[var(--paper)] p-6">
            <input type="hidden" name="communityId" value={communityId} />
            <h2 className="font-display text-2xl">Community details</h2>
            <label className="mt-5 block text-sm font-semibold" htmlFor="name">Name</label>
            <input id="name" name="name" required defaultValue={community.name} className="mt-2 w-full rounded-xl border bg-white px-4 py-3" />
            <label className="mt-4 block text-sm font-semibold" htmlFor="locality">Locality</label>
            <input id="locality" name="locality" required defaultValue={community.locality} className="mt-2 w-full rounded-xl border bg-white px-4 py-3" />
            <label className="mt-4 block text-sm font-semibold" htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={3} defaultValue={community.description ?? ""} className="mt-2 w-full rounded-xl border bg-white px-4 py-3" />
            <label className="mt-4 block text-sm font-semibold" htmlFor="rules">Rules</label>
            <textarea id="rules" name="rules" rows={4} defaultValue={community.rules ?? ""} className="mt-2 w-full rounded-xl border bg-white px-4 py-3" />
            <button className="mt-5 rounded-xl bg-[var(--forest)] px-5 py-3 font-bold text-white">Save details</button>
          </form>

          <div className="space-y-6">
            <form action={rotateInvitationAction} className="rounded-2xl bg-[var(--leaf)]/60 p-6">
              <input type="hidden" name="communityId" value={communityId} />
              <h2 className="font-display text-2xl">Rotate invitation code</h2>
              <p className="mt-2 text-sm text-[var(--ink-muted)]">The previous code stops working immediately.</p>
              <input name="invitationCode" required minLength={6} placeholder="New private code" className="mt-5 w-full rounded-xl border bg-white px-4 py-3" />
              <button className="mt-4 rounded-xl bg-[var(--forest)] px-5 py-3 font-bold text-white">Rotate code</button>
            </form>

            <form action={addPickupLocationAction} className="rounded-2xl border p-6">
              <input type="hidden" name="communityId" value={communityId} />
              <h2 className="font-display text-2xl">Add pickup location</h2>
              <input name="name" required placeholder="Community Hall" className="mt-5 w-full rounded-xl border bg-white px-4 py-3" />
              <input name="description" placeholder="Meeting point details" className="mt-3 w-full rounded-xl border bg-white px-4 py-3" />
              <button className="mt-4 rounded-xl border px-5 py-3 font-bold">Add location</button>
            </form>

            <div className="rounded-2xl border p-6">
              <h2 className="font-display text-2xl">Pickup locations</h2>
              <div className="mt-5 space-y-3">
                {pickupLocations.length === 0 && <p className="text-sm text-[var(--ink-muted)]">No active pickup locations.</p>}
                {pickupLocations.map((location) => <div key={location.id} className="flex items-center justify-between border-t pt-3 text-sm"><span><strong>{location.name}</strong><span className="block text-[var(--ink-muted)]">{location.description}</span></span><form action={removePickupLocationAction}><input type="hidden" name="communityId" value={communityId} /><input type="hidden" name="locationId" value={location.id} /><button className="text-xs font-bold text-red-700">Remove</button></form></div>)}
              </div>
            </div>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border p-6">
          <h2 className="font-display text-2xl">Member details</h2>
          <div className="mt-5 space-y-3">
            {memberRows.map((member) => <div key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3"><span><strong className="block text-sm">{member.profiles?.display_name ?? "Member"}</strong><span className="text-xs text-[var(--ink-muted)]">{member.profiles?.locality ?? "Locality not shared"} · {member.status} · {member.role}</span></span>{member.user_id !== user.id && member.role !== "admin" && <form action={removeMemberAction}><input type="hidden" name="communityId" value={communityId} /><input type="hidden" name="memberId" value={member.user_id} /><button className="rounded-lg border border-red-300 px-3 py-2 text-xs font-bold text-red-700">Remove</button></form>}</div>)}
          </div>
        </section>
      </div>
    </main>
  );
}

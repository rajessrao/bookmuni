import { createCommunityAction, joinCommunityAction } from "./actions";

export function JoinCommunityForm() {
  return (
    <form action={joinCommunityAction} className="mt-6 flex flex-col gap-3 sm:flex-row">
      <label className="sr-only" htmlFor="invitationCode">Invitation code</label>
      <input id="invitationCode" name="invitationCode" required minLength={6} placeholder="Invitation code" className="min-w-0 flex-1 rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" />
      <button className="rounded-xl bg-[var(--forest)] px-5 py-3 font-bold text-white transition hover:bg-[#163d35]">Join community</button>
    </form>
  );
}

export function CreateCommunityForm() {
  return (
    <form action={createCommunityAction} className="mt-10 space-y-5">
      <div><label className="block text-sm font-semibold" htmlFor="name">Community name</label><input id="name" name="name" required minLength={2} placeholder="Page Turner Troopers" className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /></div>
      <div><label className="block text-sm font-semibold" htmlFor="locality">Approximate locality</label><input id="locality" name="locality" required placeholder="Patancheru, Hyderabad" className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /></div>
      <div><label className="block text-sm font-semibold" htmlFor="description">Description <span className="font-normal text-[var(--ink-muted)]">(optional)</span></label><textarea id="description" name="description" rows={3} className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /></div>
      <div><label className="block text-sm font-semibold" htmlFor="rules">Community rules <span className="font-normal text-[var(--ink-muted)]">(optional)</span></label><textarea id="rules" name="rules" rows={3} placeholder="Return books on time..." className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /></div>
      <div><label className="block text-sm font-semibold" htmlFor="pickupName">Pickup location</label><input id="pickupName" name="pickupName" required defaultValue="Community Hall" className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /></div>
      <div><label className="block text-sm font-semibold" htmlFor="pickupDescription">Pickup details <span className="font-normal text-[var(--ink-muted)]">(optional)</span></label><input id="pickupDescription" name="pickupDescription" placeholder="Shared meeting point for handoffs" className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /></div>
      <div><label className="block text-sm font-semibold" htmlFor="invitationCode">Invitation code</label><input id="invitationCode" name="invitationCode" required minLength={6} placeholder="Choose a private code" className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /><p className="mt-2 text-sm text-[var(--ink-muted)]">Share this code privately. Admins can rotate it later.</p></div>
      <button className="rounded-xl bg-[var(--forest)] px-6 py-3.5 font-bold text-white transition hover:bg-[#163d35]">Create community</button>
    </form>
  );
}
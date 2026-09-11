import { createRequestAction } from "./actions";

export function RequestForm({ copyId, communityId }: { copyId: string; communityId: string }) {
  return (
    <form action={createRequestAction} className="mt-10 rounded-2xl bg-[var(--leaf)]/60 p-5">
      <input type="hidden" name="copyId" value={copyId} />
      <input type="hidden" name="communityId" value={communityId} />
      <label className="block text-sm font-semibold" htmlFor="message">Message to the lender <span className="font-normal text-[var(--ink-muted)]">(optional)</span></label>
      <textarea id="message" name="message" rows={3} placeholder="When would be a convenient time to meet?" className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" />
      <button className="mt-4 rounded-xl bg-[var(--forest)] px-5 py-3 font-bold text-white transition hover:bg-[#163d35]">Request this book</button>
      <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">The lender must approve every request. Pickup and due dates are handled after approval.</p>
    </form>
  );
}
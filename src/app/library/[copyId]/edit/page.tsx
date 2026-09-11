import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteCopyAction, updateCopyAction } from "../../edit-actions";
import { PhotoUploader } from "../../photo-uploader";

const conditions = ["New", "Like new", "Good", "Fair", "Worn", "Poor", "Damaged", "Other"];
const editableAvailability = ["private", "available", "unavailable"];

export default async function EditCopyPage({ params, searchParams }: { params: Promise<{ copyId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { copyId } = await params;
  const { error: queryError } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.is_anonymous) redirect("/auth");
    const { data: rawCopy } = await supabase.from("physical_copies").select("id, title, author, condition, language, genre, visibility, availability, notes").eq("id", copyId).eq("owner_id", user.id).maybeSingle();
    if (!rawCopy) redirect("/library?error=Book+not+found");
    const copy = rawCopy as NonNullable<typeof rawCopy>;
    const { data: memberships } = await supabase.from("community_memberships").select("community_id, communities(id, name, locality)").eq("user_id", user.id).eq("status", "approved");
    const { data: listings } = await supabase.from("copy_community_listings").select("community_id").eq("copy_id", copyId);
    const selected = new Set((listings ?? []).map((listing) => listing.community_id));
    const communities = (memberships ?? []).map((row) => row.communities).filter(Boolean) as unknown as { id: string; name: string; locality: string }[];

    return (
      <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl">
          <AppNav active="library" />
          <div className="mt-14">
            <Link href="/library" className="text-sm font-semibold text-[var(--forest)]">&lt;- My library</Link>
            <h1 className="mt-6 font-display text-5xl leading-tight">Edit your book.</h1>
            {queryError && <p role="alert" className="mt-6 rounded-xl bg-[#f7d7c2] p-4 text-sm">{queryError}</p>}
            <PhotoUploader copyId={copyId} />
            <form action={updateCopyAction} className="mt-10 space-y-5">
              <input type="hidden" name="copyId" value={copyId} />
              <div>
                <label className="block text-sm font-semibold" htmlFor="title">Title</label>
                <input id="title" name="title" required defaultValue={copy.title} className="mt-2 w-full rounded-xl border bg-white px-4 py-3" />
              </div>
              <div>
                <label className="block text-sm font-semibold" htmlFor="author">Author</label>
                <input id="author" name="author" required defaultValue={copy.author} className="mt-2 w-full rounded-xl border bg-white px-4 py-3" />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold" htmlFor="condition">Condition</label>
                  <select id="condition" name="condition" defaultValue={copy.condition} className="mt-2 w-full rounded-xl border bg-white px-4 py-3">
                    {conditions.map((condition) => <option key={condition}>{condition}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold" htmlFor="language">Language</label>
                  <input id="language" name="language" required defaultValue={copy.language} className="mt-2 w-full rounded-xl border bg-white px-4 py-3" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold" htmlFor="genre">Genre</label>
                <input id="genre" name="genre" required defaultValue={copy.genre} className="mt-2 w-full rounded-xl border bg-white px-4 py-3" />
              </div>
              <div>
                <label className="block text-sm font-semibold" htmlFor="notes">Notes</label>
                <textarea id="notes" name="notes" rows={3} defaultValue={copy.notes ?? ""} className="mt-2 w-full rounded-xl border bg-white px-4 py-3" />
              </div>
              <fieldset>
                <legend className="text-sm font-semibold">Availability</legend>
                <div className="mt-3 flex flex-wrap gap-3">
                  {editableAvailability.map((availability) => (
                    <label key={availability} className="rounded-xl border bg-white p-3 text-sm">
                      <input type="radio" name="availability" value={availability} defaultChecked={copy.availability === availability} className="mr-2" />
                      {availability}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[var(--ink-muted)]">Reserved and lent are controlled by the loan lifecycle.</p>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-semibold">Visibility</legend>
                <div className="mt-3 flex flex-wrap gap-3">
                  <label className="rounded-xl border bg-white p-3 text-sm">
                    <input type="radio" name="visibility" value="private" defaultChecked={copy.visibility === "private"} className="mr-2" />
                    Keep private
                  </label>
                  <label className="rounded-xl border bg-white p-3 text-sm">
                    <input type="radio" name="visibility" value="community" defaultChecked={copy.visibility === "community"} className="mr-2" />
                    Share with communities
                  </label>
                </div>
                <div className="mt-4 space-y-2">
                  {communities.map((community) => (
                    <label key={community.id} className="flex gap-3 rounded-xl border bg-white p-3 text-sm">
                      <input type="checkbox" name="communityIds" value={community.id} defaultChecked={selected.has(community.id)} />
                      <span>
                        <strong>{community.name}</strong>
                        <span className="ml-2 text-[var(--ink-muted)]">{community.locality}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button className="rounded-xl bg-[var(--forest)] px-5 py-3 font-bold text-white">Save changes</button>
            </form>
            <form action={deleteCopyAction} className="mt-6 border-t pt-6">
              <input type="hidden" name="copyId" value={copyId} />
              <button className="rounded-xl border border-red-300 px-5 py-3 font-bold text-red-700">Delete book</button>
              <p className="mt-2 text-xs text-[var(--ink-muted)]">Books with active lending records cannot be deleted.</p>
            </form>
          </div>
        </div>
      </main>
    );

  return <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16"><div className="mx-auto max-w-3xl"><AppNav active="library" /><div className="mt-14"><Link href="/library" className="text-sm font-semibold text-[var(--forest)]">&lt;- My library</Link><h1 className="mt-6 font-display text-5xl leading-tight">Edit your book.</h1>{queryError && <p role="alert" className="mt-6 rounded-xl bg-[#f7d7c2] p-4 text-sm">{queryError}</p>}<form action={updateCopyAction} className="mt-10 space-y-5"><input type="hidden" name="copyId" value={copyId} /><div><label className="block text-sm font-semibold" htmlFor="title">Title</label><input id="title" name="title" required defaultValue={copy.title} className="mt-2 w-full rounded-xl border bg-white px-4 py-3" /></div><div><label className="block text-sm font-semibold" htmlFor="author">Author</label><input id="author" name="author" required defaultValue={copy.author} className="mt-2 w-full rounded-xl border bg-white px-4 py-3" /></div><div className="grid gap-5 sm:grid-cols-2"><div><label className="block text-sm font-semibold" htmlFor="condition">Condition</label><select id="condition" name="condition" defaultValue={copy.condition} className="mt-2 w-full rounded-xl border bg-white px-4 py-3">{conditions.map((condition) => <option key={condition}>{condition}</option>)}</select></div><div><label className="block text-sm font-semibold" htmlFor="language">Language</label><input id="language" name="language" required defaultValue={copy.language} className="mt-2 w-full rounded-xl border bg-white px-4 py-3" /></div></div><div><label className="block text-sm font-semibold" htmlFor="genre">Genre</label><input id="genre" name="genre" required defaultValue={copy.genre} className="mt-2 w-full rounded-xl border bg-white px-4 py-3" /></div><div><label className="block text-sm font-semibold" htmlFor="notes">Notes</label><textarea id="notes" name="notes" rows={3} defaultValue={copy.notes ?? ""} className="mt-2 w-full rounded-xl border bg-white px-4 py-3" /></div><fieldset><legend className="text-sm font-semibold">Availability</legend><div className="mt-3 flex flex-wrap gap-3">{["private", "available", "unavailable"].map((availability) => <label key={availability} className="rounded-xl border bg-white p-3 text-sm"><input type="radio" name="availability" value={availability} defaultChecked={copy.availability === availability} className="mr-2" />{availability}</label>)}</div><p className="mt-2 text-xs text-[var(--ink-muted)]">Reserved and lent are controlled by the loan lifecycle.</p></fieldset><fieldset><legend className="text-sm font-semibold">Visibility</legend><div className="mt-3 flex flex-wrap gap-3"><label className="rounded-xl border bg-white p-3 text-sm"><input type="radio" name="visibility" value="private" defaultChecked={copy.visibility === "private"} className="mr-2" />Keep private</label><label className="rounded-xl border bg-white p-3 text-sm"><input type="radio" name="visibility" value="community" defaultChecked={copy.visibility === "community"} className="mr-2" />Share with communities</label></div>{communities.length > 0 && <div className="mt-4 space-y-2">{communities.map((community) => <label key={community.id} className="flex gap-3 rounded-xl border bg-white p-3 text-sm"><input type="checkbox" name="communityIds" value={community.id} defaultChecked={selected.has(community.id)} /><span><strong>{community.name}</strong><span className="ml-2 text-[var(--ink-muted)]">{community.locality}</span></span></label>)}</div>}</fieldset><button className="rounded-xl bg-[var(--forest)] px-5 py-3 font-bold text-white">Save changes</button></form><form action={deleteCopyAction} className="mt-6 border-t pt-6"><input type="hidden" name="copyId" value={copyId} /><button className="rounded-xl border border-red-300 px-5 py-3 font-bold text-red-700">Delete book</button><p className="mt-2 text-xs text-[var(--ink-muted)]">Books with active lending records cannot be deleted.</p></form></div></div></main>;
}
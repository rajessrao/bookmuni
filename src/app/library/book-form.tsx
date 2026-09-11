"use client";

import { useState } from "react";
import { createCopyAction } from "./actions";

type Community = { id: string; name: string; locality: string };

type Metadata = {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  edition: string;
  publicationYear: string;
  language: string;
  coverImage: string;
  source: string;
};

const conditions = ["New", "Like new", "Good", "Fair", "Worn", "Poor", "Damaged", "Other"];

export function BookForm({ communities }: { communities: Community[] }) {
  const [isbn, setIsbn] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [visibility, setVisibility] = useState("private");

  async function lookupIsbn() {
    setLookupBusy(true);
    setLookupMessage("");
    try {
      const response = await fetch(`/api/books/isbn?isbn=${encodeURIComponent(isbn)}`);
      const payload = await response.json();
      if (!response.ok) {
        setLookupMessage(payload.error ?? "No book details found. Enter them manually.");
        setMetadata(null);
        return;
      }
      setMetadata(payload);
      setIsbn(payload.isbn);
      setLookupMessage(`Details found via ${payload.source}. Review them before saving.`);
    } catch {
      setLookupMessage("Book lookup is unavailable. Enter the details manually.");
    } finally {
      setLookupBusy(false);
    }
  }

  return (
    <form key={metadata?.isbn ?? "manual"} action={createCopyAction} className="mt-10 space-y-6">
      <section className="rounded-2xl bg-[var(--leaf)]/60 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1"><label className="block text-sm font-semibold" htmlFor="isbn">ISBN</label><input id="isbn" name="isbn" value={isbn} onChange={(event) => setIsbn(event.target.value)} placeholder="978..." className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /></div><button type="button" onClick={lookupIsbn} disabled={lookupBusy || !isbn.trim()} className="rounded-xl bg-[var(--forest)] px-5 py-3 font-bold text-white disabled:opacity-50">{lookupBusy ? "Looking up..." : "Look up ISBN"}</button></div>{lookupMessage && <p role="status" className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{lookupMessage}</p>}</section>
      <div><label className="block text-sm font-semibold" htmlFor="title">Title</label><input id="title" name="title" required defaultValue={metadata?.title} className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /></div>
      <div><label className="block text-sm font-semibold" htmlFor="author">Author</label><input id="author" name="author" required defaultValue={metadata?.author} className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /></div>
      <div className="grid gap-5 sm:grid-cols-2"><div><label className="block text-sm font-semibold" htmlFor="condition">Condition</label><select id="condition" name="condition" required defaultValue="Good" className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]">{conditions.map((condition) => <option key={condition}>{condition}</option>)}</select></div><div><label className="block text-sm font-semibold" htmlFor="language">Language</label><input id="language" name="language" required defaultValue={metadata?.language ?? "English"} className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /></div></div>
      <div className="grid gap-5 sm:grid-cols-2"><div><label className="block text-sm font-semibold" htmlFor="genre">Genre</label><input id="genre" name="genre" required placeholder="Fiction, history, science..." className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /></div><div><label className="block text-sm font-semibold" htmlFor="publisher">Publisher <span className="font-normal text-[var(--ink-muted)]">(optional)</span></label><input id="publisher" name="publisher" defaultValue={metadata?.publisher} className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /></div></div>
      <div className="grid gap-5 sm:grid-cols-2"><div><label className="block text-sm font-semibold" htmlFor="edition">Edition <span className="font-normal text-[var(--ink-muted)]">(optional)</span></label><input id="edition" name="edition" defaultValue={metadata?.edition} className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /></div><div><label className="block text-sm font-semibold" htmlFor="publicationYear">Publication year <span className="font-normal text-[var(--ink-muted)]">(optional)</span></label><input id="publicationYear" name="publicationYear" type="number" min="1000" max="2100" defaultValue={metadata?.publicationYear} className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /></div></div>
      <div><label className="block text-sm font-semibold" htmlFor="coverImage">Cover image URL <span className="font-normal text-[var(--ink-muted)]">(optional)</span></label><input id="coverImage" name="coverImage" type="url" defaultValue={metadata?.coverImage} className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /></div>
      <div><label className="block text-sm font-semibold" htmlFor="notes">Notes <span className="font-normal text-[var(--ink-muted)]">(optional)</span></label><textarea id="notes" name="notes" rows={3} placeholder="Personal notes about this copy" className="mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--leaf)]" /></div>
      <fieldset><legend className="text-sm font-semibold">Visibility</legend><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="rounded-xl border bg-white p-4"><input type="radio" name="visibility" value="private" checked={visibility === "private"} onChange={() => setVisibility("private")} className="mr-2" /> Keep private</label><label className="rounded-xl border bg-white p-4"><input type="radio" name="visibility" value="community" checked={visibility === "community"} onChange={() => setVisibility("community")} className="mr-2" /> Share with communities</label></div></fieldset>
      {visibility === "community" && <fieldset><legend className="text-sm font-semibold">Approved communities</legend><div className="mt-3 space-y-2">{communities.length === 0 ? <p className="text-sm text-[var(--ink-muted)]">Join and get approved in a community before sharing books.</p> : communities.map((community) => <label key={community.id} className="flex items-center gap-3 rounded-xl border bg-white p-4 text-sm"><input type="checkbox" name="communityIds" value={community.id} /> <span><strong className="block">{community.name}</strong><span className="text-[var(--ink-muted)]">{community.locality}</span></span></label>)}</div></fieldset>}
      <button className="rounded-xl bg-[var(--forest)] px-6 py-3.5 font-bold text-white transition hover:bg-[#163d35]">Save book</button>
    </form>
  );
}
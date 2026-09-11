import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = { q?: string; genre?: string; language?: string; condition?: string; availability?: string };
type BookCopy = { id: string; title: string; author: string; condition: string; language: string; genre: string; availability: string };

const conditions = ["New", "Like new", "Good", "Fair", "Worn", "Poor", "Damaged", "Other"];
const availabilityOptions = ["available", "reserved", "lent", "unavailable"];

export const dynamic = "force-dynamic";

export default async function CommunityBooksPage({ params, searchParams }: { params: Promise<{ communityId: string }>; searchParams: Promise<SearchParams> }) {
  const { communityId } = await params;
  const filters = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/auth");

  const { data: membership } = await supabase.from("community_memberships").select("status").eq("community_id", communityId).eq("user_id", user.id).maybeSingle();
  if (membership?.status !== "approved") redirect("/communities");
  const { data: community } = await supabase.from("communities").select("id, name, locality").eq("id", communityId).maybeSingle();
  if (!community) redirect("/communities");

  let query = supabase.from("physical_copies").select("id, title, author, condition, language, genre, availability, copy_community_listings!inner(community_id, is_active)").eq("copy_community_listings.community_id", communityId).eq("copy_community_listings.is_active", true).eq("visibility", "community");
  if (filters.q?.trim()) query = query.or(`title.ilike.%${filters.q.trim()}%,author.ilike.%${filters.q.trim()}%`);
  if (filters.genre) query = query.eq("genre", filters.genre);
  if (filters.language) query = query.eq("language", filters.language);
  if (filters.condition) query = query.eq("condition", filters.condition);
  if (filters.availability) query = query.eq("availability", filters.availability);
  const { data, error } = await query.order("created_at", { ascending: false });
  const copies = (data ?? []) as unknown as BookCopy[];
  const genres = [...new Set(copies.map((copy) => copy.genre))].sort();
  const languages = [...new Set(copies.map((copy) => copy.language))].sort();

  return <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16"><div className="mx-auto max-w-6xl"><AppNav active="communities" /><div className="mt-14"><Link href={`/communities/${communityId}`} className="text-sm font-semibold text-[var(--forest)]">&lt;- {community.name}</Link><p className="mt-7 text-sm font-bold uppercase tracking-[0.18em] text-[var(--apricot)]">Community shelf</p><h1 className="mt-4 font-display text-5xl leading-tight">Books nearby.</h1><p className="mt-4 text-lg text-[var(--ink-muted)]">{community.locality}</p></div>{error && <p role="alert" className="mt-8 rounded-xl bg-[#f7d7c2] px-4 py-3 text-sm">Could not load this community shelf: {error.message}</p>}<form className="mt-10 grid gap-3 rounded-2xl bg-[var(--leaf)]/60 p-5 sm:grid-cols-2 lg:grid-cols-5"><input name="q" defaultValue={filters.q} placeholder="Search title or author" className="rounded-xl border bg-white px-4 py-3 outline-none focus:border-[var(--forest)] sm:col-span-2 lg:col-span-2" /><select name="genre" defaultValue={filters.genre ?? ""} className="rounded-xl border bg-white px-4 py-3"><option value="">All genres</option>{genres.map((genre) => <option key={genre}>{genre}</option>)}</select><select name="language" defaultValue={filters.language ?? ""} className="rounded-xl border bg-white px-4 py-3"><option value="">All languages</option>{languages.map((language) => <option key={language}>{language}</option>)}</select><select name="condition" defaultValue={filters.condition ?? ""} className="rounded-xl border bg-white px-4 py-3"><option value="">All conditions</option>{conditions.map((condition) => <option key={condition}>{condition}</option>)}</select><select name="availability" defaultValue={filters.availability ?? ""} className="rounded-xl border bg-white px-4 py-3"><option value="">All availability</option>{availabilityOptions.map((availability) => <option key={availability}>{availability}</option>)}</select><button className="rounded-xl bg-[var(--forest)] px-4 py-3 font-bold text-white sm:col-span-2 lg:col-span-5 lg:w-fit">Apply filters</button></form><div className="mt-10 flex items-center justify-between"><h2 className="font-display text-2xl">{copies.length} {copies.length === 1 ? "book" : "books"}</h2></div>{copies.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed p-8 text-[var(--ink-muted)]">No books match those filters yet.</div> : <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{copies.map((copy) => <Link key={copy.id} href={`/books/${copy.id}?communityId=${communityId}`} className="rounded-2xl border bg-[var(--paper)] p-5 transition hover:-translate-y-0.5 hover:shadow-lg"><p className="text-xs font-bold uppercase tracking-wider text-[var(--apricot)]">{copy.availability}</p><h3 className="mt-3 font-display text-2xl leading-tight">{copy.title}</h3><p className="mt-2 text-sm text-[var(--ink-muted)]">{copy.author}</p><div className="mt-6 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-[var(--leaf)] px-3 py-1">{copy.condition}</span><span className="rounded-full border px-3 py-1">{copy.genre}</span><span className="rounded-full border px-3 py-1">{copy.language}</span></div></Link>)}</div>}</div></main>;
}
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { RequestForm } from "@/app/requests/request-form";
import { ReportForm } from "@/app/moderation/report-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CopyDetail = {
  id: string;
  title: string;
  author: string;
  condition: string;
  language: string;
  genre: string;
  availability: string;
  notes: string | null;
  owner_id: string;
  editions: {
    isbn: string | null;
    publisher: string | null;
    edition_label: string | null;
    publication_year: number | null;
    cover_image_path: string | null;
  } | null;
};

export default async function BookDetailPage({ params, searchParams }: { params: Promise<{ copyId: string }>; searchParams: Promise<{ communityId?: string }> }) {
  const { copyId } = await params;
  const { communityId } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.is_anonymous) redirect("/auth");
  if (!communityId) redirect("/communities");

  const { data: membership } = await supabase.from("community_memberships").select("status").eq("community_id", communityId).eq("user_id", user.id).maybeSingle();
  if (membership?.status !== "approved") redirect("/communities");

  const { data: copy } = await supabase.from("physical_copies").select("id, title, author, condition, language, genre, availability, notes, owner_id, editions(isbn, publisher, edition_label, publication_year, cover_image_path)").eq("id", copyId).maybeSingle();
  if (!copy) notFound();

  const { data: listing } = await supabase.from("copy_community_listings").select("is_active").eq("copy_id", copyId).eq("community_id", communityId).eq("is_active", true).maybeSingle();
  if (!listing) notFound();

  const detail = copy as unknown as CopyDetail;
  const { data: owner } = await supabase.from("profiles").select("display_name, locality").eq("id", detail.owner_id).maybeSingle();
  const { data: community } = await supabase.from("communities").select("name").eq("id", communityId).maybeSingle();
  const canRequest = detail.owner_id !== user.id && detail.availability === "available";

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <AppNav active="communities" />
        <div className="mt-14">
          <Link href={`/communities/${communityId}/books`} className="text-sm font-semibold text-[var(--forest)]">&lt;- {community?.name ?? "Community shelf"}</Link>
          <div className="mt-10 grid gap-10 lg:grid-cols-[0.65fr_1fr]">
            <div className="flex min-h-80 items-center justify-center rounded-2xl bg-[#f0dfc3] p-8">
              <div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--forest)]">Physical copy</p><h1 className="mt-6 font-display text-4xl leading-tight text-[var(--forest)]">{detail.title}</h1></div>
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--apricot)]">Available in {community?.name}</p>
              <h2 className="mt-4 font-display text-5xl leading-tight">{detail.title}</h2>
              <p className="mt-3 text-xl text-[var(--ink-muted)]">{detail.author}</p>
              <div className="mt-8 flex flex-wrap gap-2 text-sm"><span className="rounded-full bg-[var(--leaf)] px-4 py-2">{detail.condition}</span><span className="rounded-full border px-4 py-2">{detail.language}</span><span className="rounded-full border px-4 py-2">{detail.genre}</span><span className="rounded-full border px-4 py-2">{detail.availability}</span></div>
              <div className="mt-10 border-t pt-6"><h3 className="font-semibold">Lender</h3><p className="mt-2">{owner?.display_name ?? "Community member"}</p><p className="text-sm text-[var(--ink-muted)]">Approximate locality: {owner?.locality ?? "Not shared"}</p></div>
              {detail.editions && <div className="mt-8 border-t pt-6 text-sm text-[var(--ink-muted)]"><h3 className="font-semibold text-[var(--foreground)]">Edition details</h3>{detail.editions.isbn && <p className="mt-2">ISBN: {detail.editions.isbn}</p>}{detail.editions.publisher && <p>Publisher: {detail.editions.publisher}</p>}{detail.editions.publication_year && <p>Published: {detail.editions.publication_year}</p>}</div>}
              {detail.notes && <div className="mt-8 border-t pt-6"><h3 className="font-semibold">Lender notes</h3><p className="mt-2 whitespace-pre-wrap leading-7 text-[var(--ink-muted)]">{detail.notes}</p></div>}
              {canRequest ? <RequestForm copyId={copyId} communityId={communityId} /> : <p className="mt-10 rounded-xl bg-[var(--leaf)]/60 p-4 text-sm leading-6 text-[var(--ink-muted)]">This copy is not currently available to request.</p>}
              <ReportForm communityId={communityId} targetType="listing" targetUserId={detail.owner_id} targetCopyId={copyId} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
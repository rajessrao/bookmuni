"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectWithError(error: string): never {
  redirect(`/library/new?error=${encodeURIComponent(error)}`);
}

export async function createCopyAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/auth");

  const visibility = String(formData.get("visibility") ?? "private") === "community" ? "community" : "private";
  const selectedCommunityIds = formData.getAll("communityIds").map(String).filter(Boolean);
  const publicationYearValue = Number(formData.get("publicationYear"));

  if (visibility === "community" && selectedCommunityIds.length === 0) {
    redirectWithError("Select at least one approved community when sharing a book.");
  }

  const { data: copyId, error } = await supabase.rpc("create_physical_copy", {
    copy_title: String(formData.get("title") ?? "").trim(),
    copy_author: String(formData.get("author") ?? "").trim(),
    copy_condition: String(formData.get("condition") ?? "").trim(),
    copy_language: String(formData.get("language") ?? "").trim(),
    copy_genre: String(formData.get("genre") ?? "").trim(),
    copy_visibility: visibility,
    copy_isbn: String(formData.get("isbn") ?? "").trim() || null,
    copy_publisher: String(formData.get("publisher") ?? "").trim(),
    copy_edition_label: String(formData.get("edition") ?? "").trim(),
    copy_publication_year: Number.isInteger(publicationYearValue) && publicationYearValue > 0 ? publicationYearValue : null,
    copy_cover_image_path: String(formData.get("coverImage") ?? "").trim(),
    copy_notes: String(formData.get("notes") ?? "").trim(),
    selected_community_ids: selectedCommunityIds,
  });

  if (error || !copyId) redirectWithError(error?.message ?? "Could not save this book.");

  revalidatePath("/library");
    revalidatePath("/communities", "layout");
  redirect(`/library?created=${encodeURIComponent(String(copyId))}`);
}
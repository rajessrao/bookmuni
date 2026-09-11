"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function ownerContext(copyId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/auth");
  const { data: copy } = await supabase.from("physical_copies").select("id, owner_id").eq("id", copyId).eq("owner_id", user.id).maybeSingle();
  if (!copy) redirect("/library?error=Book+not+found+or+not+owned+by+you");
  return { supabase, user };
}

export async function updateCopyAction(formData: FormData) {
  const copyId = String(formData.get("copyId") ?? "");
  const { supabase } = await ownerContext(copyId);
  const visibility = String(formData.get("visibility") ?? "private") === "community" ? "community" : "private";
  const availability = String(formData.get("availability") ?? "private");
  const safeAvailability = ["private", "available", "unavailable"].includes(availability) ? availability : "private";
  const communityIds = formData.getAll("communityIds").map(String).filter(Boolean);

  if (visibility === "community" && communityIds.length === 0) redirect(`/library/${copyId}/edit?error=Select+at+least+one+community`);

  const { error } = await supabase.from("physical_copies").update({
    title: String(formData.get("title") ?? "").trim(),
    author: String(formData.get("author") ?? "").trim(),
    condition: String(formData.get("condition") ?? "").trim(),
    language: String(formData.get("language") ?? "").trim(),
    genre: String(formData.get("genre") ?? "").trim(),
    visibility,
    availability: safeAvailability,
    notes: String(formData.get("notes") ?? "").trim() || null,
  }).eq("id", copyId);
  if (error) redirect(`/library/${copyId}/edit?error=${encodeURIComponent(error.message)}`);

  await supabase.from("copy_community_listings").delete().eq("copy_id", copyId);
  if (visibility === "community") {
    const { error: listingError } = await supabase.from("copy_community_listings").insert(communityIds.map((communityId) => ({ copy_id: copyId, community_id: communityId })));
    if (listingError) redirect(`/library/${copyId}/edit?error=${encodeURIComponent(listingError.message)}`);
  }

  revalidatePath("/library");
  revalidatePath(`/library/${copyId}/edit`);
  redirect("/library");
}

export async function deleteCopyAction(formData: FormData) {
  const copyId = String(formData.get("copyId") ?? "");
  const { supabase } = await ownerContext(copyId);
  const { error } = await supabase.from("physical_copies").delete().eq("id", copyId);
  if (error) redirect(`/library/${copyId}/edit?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/library");
  redirect("/library");
}

export async function updateCoverImageAction(formData: FormData) {
  const copyId = String(formData.get("copyId") ?? "");
  const coverPath = String(formData.get("coverPath") ?? "");
  const { supabase } = await ownerContext(copyId);
  const { data: copy } = await supabase.from("physical_copies").select("edition_id").eq("id", copyId).maybeSingle();
  if (!copy?.edition_id) redirect(`/library/${copyId}/edit?error=Edition+not+found`);
  const { error } = await supabase.from("editions").update({ cover_image_path: coverPath }).eq("id", copy.edition_id);
  if (error) redirect(`/library/${copyId}/edit?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/library/${copyId}/edit`);
  redirect(`/library/${copyId}/edit`);
}
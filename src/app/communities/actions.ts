"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectWithError(path: string, error: string): never {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.is_anonymous) redirect("/auth");
  return { supabase, user };
}

export async function createCommunityAction(formData: FormData) {
  const { supabase } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const locality = String(formData.get("locality") ?? "").trim();
  const invitationCode = String(formData.get("invitationCode") ?? "").trim();

  if (!name || !locality || invitationCode.length < 6) {
    redirectWithError("/communities/new", "Name, locality, and an invitation code of at least 6 characters are required.");
  }

  const { data: communityId, error } = await supabase.rpc("create_community", {
    community_name: name,
    community_description: String(formData.get("description") ?? ""),
    community_locality: locality,
    community_rules: String(formData.get("rules") ?? ""),
    invitation_code: invitationCode,
    pickup_name: String(formData.get("pickupName") ?? "Community Hall"),
    pickup_description: String(formData.get("pickupDescription") ?? ""),
  });

  if (error || !communityId) {
    redirectWithError("/communities/new", error?.message ?? "Could not create the community.");
  }

  revalidatePath("/communities");
  redirect(`/communities/${communityId}`);
}

export async function joinCommunityAction(formData: FormData) {
  const { supabase } = await requireUser();
  const invitationCode = String(formData.get("invitationCode") ?? "").trim();

  if (invitationCode.length < 6) {
    redirectWithError("/communities", "Enter a valid invitation code.");
  }

  const { data: communityId, error } = await supabase.rpc("join_community_by_invitation", {
    invitation_code: invitationCode,
  });

  if (error || !communityId) {
    redirectWithError("/communities", error?.message ?? "Could not join the community.");
  }

  revalidatePath("/communities");
  redirect(`/communities/${communityId}`);
}

export async function approveMembershipAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const communityId = String(formData.get("communityId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  const { error } = await supabase
    .from("community_memberships")
    .update({ status: "approved", approved_by: user.id, joined_at: new Date().toISOString() })
    .eq("community_id", communityId)
    .eq("user_id", memberId)
    .eq("status", "pending");

  if (error) redirectWithError(`/communities/${communityId}`, error.message);

  revalidatePath(`/communities/${communityId}`);
  redirect(`/communities/${communityId}`);
}

export async function rejectMembershipAction(formData: FormData) {
  const { supabase } = await requireUser();
  const communityId = String(formData.get("communityId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  const { error } = await supabase
    .from("community_memberships")
    .update({ status: "rejected" })
    .eq("community_id", communityId)
    .eq("user_id", memberId)
    .eq("status", "pending");

  if (error) redirectWithError(`/communities/${communityId}`, error.message);

  revalidatePath(`/communities/${communityId}`);
  redirect(`/communities/${communityId}`);
}

export async function updateCommunityAdminAction(formData: FormData) {
  const { supabase } = await requireUser();
  const communityId = String(formData.get("communityId") ?? "");
  const { error } = await supabase.from("communities").update({
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    locality: String(formData.get("locality") ?? "").trim(),
    rules: String(formData.get("rules") ?? "").trim() || null,
  }).eq("id", communityId);
  if (error) redirectWithError(`/communities/${communityId}/admin`, error.message);
  revalidatePath(`/communities/${communityId}`);
  revalidatePath(`/communities/${communityId}/admin`);
  redirect(`/communities/${communityId}/admin`);
}

export async function rotateInvitationAction(formData: FormData) {
  const { supabase } = await requireUser();
  const communityId = String(formData.get("communityId") ?? "");
  const code = String(formData.get("invitationCode") ?? "").trim();
  const { error } = await supabase.rpc("rotate_community_invitation", { target_community_id: communityId, new_invitation_code: code });
  if (error) redirectWithError(`/communities/${communityId}/admin`, error.message);
  redirect(`/communities/${communityId}/admin?saved=invitation`);
}

export async function addPickupLocationAction(formData: FormData) {
  const { supabase } = await requireUser();
  const communityId = String(formData.get("communityId") ?? "");
  const { error } = await supabase.from("community_pickup_locations").insert({ community_id: communityId, name: String(formData.get("name") ?? "").trim(), description: String(formData.get("description") ?? "").trim() || null });
  if (error) redirectWithError(`/communities/${communityId}/admin`, error.message);
  redirect(`/communities/${communityId}/admin`);
}

export async function removePickupLocationAction(formData: FormData) {
  const { supabase } = await requireUser();
  const communityId = String(formData.get("communityId") ?? "");
  const locationId = String(formData.get("locationId") ?? "");
  const { error } = await supabase.from("community_pickup_locations").update({ is_active: false }).eq("id", locationId).eq("community_id", communityId);
  if (error) redirectWithError(`/communities/${communityId}/admin`, error.message);
  redirect(`/communities/${communityId}/admin`);
}

export async function removeMemberAction(formData: FormData) {
  const { supabase } = await requireUser();
  const communityId = String(formData.get("communityId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const { error } = await supabase.from("community_memberships").update({ status: "removed" }).eq("community_id", communityId).eq("user_id", memberId);
  if (error) redirectWithError(`/communities/${communityId}/admin`, error.message);
  redirect(`/communities/${communityId}/admin`);
}
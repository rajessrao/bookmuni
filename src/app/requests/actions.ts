"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/auth");
  return supabase;
}

function requestPath(requestId: string) {
  return `/requests?requestId=${encodeURIComponent(requestId)}`;
}

export async function createRequestAction(formData: FormData) {
  const supabase = await requireUser();
  const copyId = String(formData.get("copyId") ?? "");
  const communityId = String(formData.get("communityId") ?? "");
  const { data: requestId, error } = await supabase.rpc("create_loan_request", {
    requested_copy_id: copyId,
    requested_community_id: communityId,
    request_message: String(formData.get("message") ?? ""),
  });

  if (error || !requestId) redirect(`${requestPath("")}&error=${encodeURIComponent(error?.message ?? "Could not create request")}`);
  revalidatePath("/requests");
  redirect("/requests");
}

export async function respondToRequestAction(formData: FormData) {
  const supabase = await requireUser();
  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "declined");
  const { error } = await supabase.rpc("respond_to_loan_request", { target_request_id: requestId, decision });
  if (error) redirect(`/requests?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/requests");
  if (decision === "approved") redirect("/loans");
  redirect("/requests");
}

export async function cancelRequestAction(formData: FormData) {
  const supabase = await requireUser();
  const requestId = String(formData.get("requestId") ?? "");
  const { error } = await supabase.rpc("cancel_loan_request", { target_request_id: requestId });
  if (error) redirect(`/requests?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/requests");
  redirect("/requests");
}
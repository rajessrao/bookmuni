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

export async function createReportAction(formData: FormData) {
  const supabase = await requireUser();
  const { data: { user } } = await supabase.auth.getUser();
  const communityId = String(formData.get("communityId") ?? "");
  const { error } = await supabase.from("reports").insert({ reporter_id: user?.id, community_id: communityId, target_type: String(formData.get("targetType") ?? "member"), target_user_id: String(formData.get("targetUserId") ?? "") || null, target_copy_id: String(formData.get("targetCopyId") ?? "") || null, target_loan_id: String(formData.get("targetLoanId") ?? "") || null, reason: String(formData.get("reason") ?? "").trim(), details: String(formData.get("details") ?? "").trim() || null });
  if (error) redirect(`/moderation?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/moderation");
  redirect("/moderation?saved=report");
}

export async function blockUserAction(formData: FormData) {
  const supabase = await requireUser();
  const { data: { user } } = await supabase.auth.getUser();
  const blockedId = String(formData.get("blockedId") ?? "");
  const { error } = await supabase.from("blocked_users").upsert({ blocker_id: user?.id, blocked_id: blockedId });
  if (error) redirect(`/moderation?error=${encodeURIComponent(error.message)}`);
  redirect("/moderation?saved=blocked");
}

export async function createRatingAction(formData: FormData) {
  const supabase = await requireUser();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("transaction_ratings").insert({ loan_id: String(formData.get("loanId") ?? ""), from_user_id: user?.id, to_user_id: String(formData.get("toUserId") ?? ""), rating: String(formData.get("rating") ?? "neutral"), feedback: String(formData.get("feedback") ?? "").trim() || null });
  if (error) redirect(`/loans/${formData.get("loanId")}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/loans/${formData.get("loanId")}`);
  redirect(`/loans/${formData.get("loanId")}`);
}

export async function resolveReportAction(formData: FormData) {
  const supabase = await requireUser();
  const reportId = String(formData.get("reportId") ?? "");
  const status = String(formData.get("status") ?? "resolved");
  const { data: report } = await supabase.from("reports").select("community_id").eq("id", reportId).maybeSingle();
  if (!report) redirect("/moderation?error=Report+not+found");
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("reports").update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", reportId);
  if (error) redirect(`/communities/${report.community_id}/admin/reports?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/communities/${report.community_id}/admin/reports`);
  redirect(`/communities/${report.community_id}/admin/reports`);
}
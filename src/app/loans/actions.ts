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

export async function confirmPickupAction(formData: FormData) {
  const supabase = await requireUser();
  const loanId = String(formData.get("loanId") ?? "");
  const { error } = await supabase.rpc("confirm_loan_pickup", { target_loan_id: loanId });
  if (error) redirect(`/loans/${loanId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/loans/${loanId}`);
  redirect(`/loans/${loanId}`);
}

export async function confirmReturnAction(formData: FormData) {
  const supabase = await requireUser();
  const loanId = String(formData.get("loanId") ?? "");
  const { error } = await supabase.rpc("confirm_loan_return", { target_loan_id: loanId });
  if (error) redirect(`/loans/${loanId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/loans/${loanId}`);
  redirect(`/loans/${loanId}`);
}

export async function closeLoanAction(formData: FormData) {
  const supabase = await requireUser();
  const loanId = String(formData.get("loanId") ?? "");
  const { error } = await supabase.rpc("close_loan", { target_loan_id: loanId });
  if (error) redirect(`/loans/${loanId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/loans/${loanId}`);
  redirect(`/loans/${loanId}`);
}
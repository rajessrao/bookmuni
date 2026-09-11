import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";

let client: SupabaseClient | undefined;

export function createSupabaseBrowserClient() {
  if (!client) {
    const { url, anonKey } = getSupabaseEnv();
    client = createBrowserClient(url, anonKey);
  }

  return client;
}
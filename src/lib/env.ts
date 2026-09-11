function requiredEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env.local and add your Supabase project value.`);
  }

  return value;
}

export function getSupabaseEnv() {
  return {
    url: requiredEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}
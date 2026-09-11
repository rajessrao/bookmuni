import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  { email: "admin.test@bookmuni.local", password: "BookmuniTest123!", displayName: "Community Admin", locality: "Patancheru" },
  { email: "reader.one@bookmuni.local", password: "BookmuniTest123!", displayName: "Reader One", locality: "Patancheru" },
  { email: "reader.two@bookmuni.local", password: "BookmuniTest123!", displayName: "Reader Two", locality: "Patancheru" },
];

const userIds = new Map();

for (const testUser of users) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: testUser.email,
    password: testUser.password,
    email_confirm: true,
    user_metadata: { display_name: testUser.displayName },
  });

  if (error && !error.message.toLowerCase().includes("already been registered")) {
    throw new Error(`${testUser.email}: ${error.message}`);
  }

  let userId = data.user?.id;
  if (!userId) {
    const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw listError;
    userId = listed.users.find((user) => user.email === testUser.email)?.id;
  }

  if (!userId) throw new Error(`Could not resolve user ID for ${testUser.email}`);
  userIds.set(testUser.email, userId);

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    display_name: testUser.displayName,
    locality: testUser.locality,
  });
  if (profileError) throw new Error(`${testUser.email} profile: ${profileError.message}`);

  console.log(`Ready: ${testUser.email} / ${testUser.password}`);
}

const pilotCommunityId = "10000000-0000-0000-0000-000000000001";
const memberships = [
  { email: "admin.test@bookmuni.local", role: "admin" },
  { email: "reader.one@bookmuni.local", role: "member" },
  { email: "reader.two@bookmuni.local", role: "member" },
];

for (const membership of memberships) {
  const userId = userIds.get(membership.email);
  const { error } = await supabase.from("community_memberships").upsert({
    community_id: pilotCommunityId,
    user_id: userId,
    status: "approved",
    role: membership.role,
    approved_by: userIds.get("admin.test@bookmuni.local"),
    joined_at: new Date().toISOString(),
  });
  if (error) throw new Error(`${membership.email} membership: ${error.message}`);
}

console.log("Pilot community memberships are approved for all three test users.");
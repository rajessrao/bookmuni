create or replace function public.get_pending_community_members(target_community_id uuid)
returns table (
  user_id uuid,
  status public.membership_status,
  role public.community_role,
  display_name text,
  locality text,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select membership.user_id,
         membership.status,
         membership.role,
         profile.display_name,
         profile.locality,
         membership.created_at
  from public.community_memberships membership
  join public.profiles profile on profile.id = membership.user_id
  where membership.community_id = target_community_id
    and membership.status = 'pending'
    and public.is_community_admin(target_community_id);
$$;
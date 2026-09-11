create extension if not exists pgcrypto with schema extensions;

create type public.membership_status as enum ('pending', 'approved', 'rejected', 'removed');
create type public.community_role as enum ('member', 'admin');

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text,
  locality text not null,
  rules text,
  invitation_code_hash text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.community_settings (
  community_id uuid primary key references public.communities(id) on delete cascade,
  default_lending_days integer not null default 14 check (default_lending_days between 1 and 60),
  invitation_required boolean not null default true,
  admin_approval_required boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.community_pickup_locations (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.community_memberships (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.membership_status not null default 'pending',
  role public.community_role not null default 'member',
  invited_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (community_id, user_id)
);

create index community_memberships_user_status_idx
  on public.community_memberships (user_id, status);
create index community_memberships_community_status_idx
  on public.community_memberships (community_id, status);
create index community_pickup_locations_community_idx
  on public.community_pickup_locations (community_id);

create trigger communities_set_updated_at
before update on public.communities
for each row execute function public.set_updated_at();

create trigger community_settings_set_updated_at
before update on public.community_settings
for each row execute function public.set_updated_at();

create trigger community_memberships_set_updated_at
before update on public.community_memberships
for each row execute function public.set_updated_at();

create or replace function public.is_approved_community_member(target_community_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.community_memberships
    where community_id = target_community_id
      and user_id = target_user_id
      and status = 'approved'
  );
$$;

create or replace function public.is_community_admin(target_community_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.community_memberships
    where community_id = target_community_id
      and user_id = target_user_id
      and status = 'approved'
      and role = 'admin'
  );
$$;

alter table public.communities enable row level security;
alter table public.community_settings enable row level security;
alter table public.community_pickup_locations enable row level security;
alter table public.community_memberships enable row level security;

create policy "Members can view their communities"
  on public.communities for select
  using (public.is_approved_community_member(id) or exists (
    select 1 from public.community_memberships
    where community_id = id and user_id = auth.uid() and status = 'pending'
  ));

create policy "Authenticated users can create communities"
  on public.communities for insert
  with check (auth.uid() = created_by and auth.uid() is not null);

create policy "Admins can update their communities"
  on public.communities for update
  using (public.is_community_admin(id))
  with check (public.is_community_admin(id));

create policy "Members can view community settings"
  on public.community_settings for select
  using (public.is_approved_community_member(community_id));

create policy "Admins can manage community settings"
  on public.community_settings for all
  using (public.is_community_admin(community_id))
  with check (public.is_community_admin(community_id));

create policy "Members can view pickup locations"
  on public.community_pickup_locations for select
  using (public.is_approved_community_member(community_id));

create policy "Admins can manage pickup locations"
  on public.community_pickup_locations for all
  using (public.is_community_admin(community_id))
  with check (public.is_community_admin(community_id));

create policy "Members can view community memberships"
  on public.community_memberships for select
  using (public.is_approved_community_member(community_id) or user_id = auth.uid());

create policy "Users can request membership"
  on public.community_memberships for insert
  with check (user_id = auth.uid() and status = 'pending' and role = 'member');

create policy "Admins can manage memberships"
  on public.community_memberships for update
  using (public.is_community_admin(community_id))
  with check (public.is_community_admin(community_id));

create policy "Admins can remove memberships"
  on public.community_memberships for delete
  using (public.is_community_admin(community_id));

create policy "Members can view shared member profiles"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1
      from public.community_memberships viewer_membership
      join public.community_memberships target_membership
        on target_membership.community_id = viewer_membership.community_id
      where viewer_membership.user_id = auth.uid()
        and viewer_membership.status = 'approved'
        and target_membership.user_id = profiles.id
        and target_membership.status = 'approved'
    )
  );

create or replace function public.create_community(
  community_name text,
  community_description text,
  community_locality text,
  community_rules text,
  invitation_code text,
  pickup_name text,
  pickup_description text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_community_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(invitation_code)) < 6 then raise exception 'Invitation code must be at least 6 characters'; end if;

  insert into public.communities (name, description, locality, rules, invitation_code_hash, created_by)
  values (
    trim(community_name), nullif(trim(community_description), ''), trim(community_locality), nullif(trim(community_rules), ''),
    encode(extensions.digest(upper(trim(invitation_code)), 'sha256'), 'hex'), auth.uid()
  )
  returning id into new_community_id;

  insert into public.community_settings (community_id) values (new_community_id);
  insert into public.community_pickup_locations (community_id, name, description)
  values (new_community_id, trim(pickup_name), nullif(trim(pickup_description), ''));
  insert into public.community_memberships (community_id, user_id, status, role, approved_by, joined_at)
  values (new_community_id, auth.uid(), 'approved', 'admin', auth.uid(), timezone('utc', now()));

  return new_community_id;
end;
$$;

create or replace function public.join_community_by_invitation(invitation_code text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_community_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select id into target_community_id
  from public.communities
  where invitation_code_hash = encode(extensions.digest(upper(trim(invitation_code)), 'sha256'), 'hex');

  if target_community_id is null then raise exception 'Invalid invitation code'; end if;

  insert into public.community_memberships (community_id, user_id, status, role)
  values (target_community_id, auth.uid(), 'pending', 'member')
  on conflict (community_id, user_id) do update
    set status = case when community_memberships.status = 'removed' then 'pending' else community_memberships.status end;

  return target_community_id;
end;
$$;

create or replace function public.rotate_community_invitation(target_community_id uuid, new_invitation_code text)
returns void
language plpgsql
security invoker
set search_path = public, extensions
as $$
begin
  if not public.is_community_admin(target_community_id) then raise exception 'Community admin access required'; end if;
  if char_length(trim(new_invitation_code)) < 6 then raise exception 'Invitation code must be at least 6 characters'; end if;

  update public.communities
  set invitation_code_hash = encode(extensions.digest(upper(trim(new_invitation_code)), 'sha256'), 'hex')
  where id = target_community_id;
end;
$$;

insert into public.communities (id, name, description, locality, rules, invitation_code_hash)
values (
  '10000000-0000-0000-0000-000000000001',
  'Page Turner Troopers',
  'A small local shelf for readers in Patancheru.',
  'Patancheru, Hyderabad',
  'Please return books on time and meet at the Community Hall pickup point.',
  encode(extensions.digest('PAGE-TURNER', 'sha256'), 'hex')
)
on conflict (id) do nothing;

insert into public.community_settings (community_id, default_lending_days, invitation_required, admin_approval_required)
values ('10000000-0000-0000-0000-000000000001', 14, true, true)
on conflict (community_id) do nothing;

insert into public.community_pickup_locations (community_id, name, description)
values ('10000000-0000-0000-0000-000000000001', 'Community Hall', 'Shared meeting point for handoffs.')
on conflict do nothing;
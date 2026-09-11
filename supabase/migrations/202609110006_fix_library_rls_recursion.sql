create or replace function public.copy_is_listed_in_approved_community(
  target_copy_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.copy_community_listings listing
    join public.community_memberships membership
      on membership.community_id = listing.community_id
     and membership.user_id = target_user_id
     and membership.status = 'approved'
    join public.physical_copies copy
      on copy.id = listing.copy_id
    where listing.copy_id = target_copy_id
      and listing.is_active
      and copy.visibility = 'community'
      and copy.availability = 'available'
  );
$$;

create or replace function public.user_can_view_copy(
  target_copy_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.physical_copies copy
    where copy.id = target_copy_id
      and (copy.owner_id = target_user_id or public.copy_is_listed_in_approved_community(copy.id, target_user_id))
  );
$$;

create or replace function public.copy_owner_is_current_user(target_copy_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.physical_copies
    where id = target_copy_id and owner_id = auth.uid()
  );
$$;

drop policy if exists "Owners can view their copies" on public.physical_copies;
drop policy if exists "Approved members can view available copies" on public.physical_copies;
drop policy if exists "Users can view relevant books" on public.books;
drop policy if exists "Users can view relevant editions" on public.editions;
drop policy if exists "Members can view active listings" on public.copy_community_listings;
drop policy if exists "Owners can manage listings" on public.copy_community_listings;

create policy "Owners and approved members can view copies"
  on public.physical_copies for select
  using (public.user_can_view_copy(id));

create policy "Users can view relevant books"
  on public.books for select
  using (exists (
    select 1
    from public.physical_copies copy
    join public.editions edition on edition.id = copy.edition_id
    where edition.book_id = books.id
      and public.user_can_view_copy(copy.id)
  ));

create policy "Users can view relevant editions"
  on public.editions for select
  using (exists (
    select 1
    from public.physical_copies copy
    where copy.edition_id = editions.id
      and public.user_can_view_copy(copy.id)
  ));

create policy "Members can view active listings"
  on public.copy_community_listings for select
  using (is_active and public.is_approved_community_member(community_id));

create policy "Owners can manage listings"
  on public.copy_community_listings for all
  using (public.copy_owner_is_current_user(copy_id))
  with check (public.copy_owner_is_current_user(copy_id));
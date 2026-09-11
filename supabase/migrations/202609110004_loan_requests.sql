create type public.loan_request_status as enum ('requested', 'approved', 'declined', 'cancelled');

create table public.loan_requests (
  id uuid primary key default gen_random_uuid(),
  copy_id uuid not null references public.physical_copies(id) on delete restrict,
  community_id uuid not null references public.communities(id) on delete restrict,
  borrower_id uuid not null references public.profiles(id) on delete restrict,
  lender_id uuid not null references public.profiles(id) on delete restrict,
  status public.loan_request_status not null default 'requested',
  message text,
  requested_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (borrower_id <> lender_id)
);

create index loan_requests_borrower_idx on public.loan_requests (borrower_id, status);
create index loan_requests_lender_idx on public.loan_requests (lender_id, status);
create index loan_requests_copy_idx on public.loan_requests (copy_id, status);
create index loan_requests_community_idx on public.loan_requests (community_id, requested_at desc);

create unique index loan_requests_one_active_per_copy_idx
  on public.loan_requests (copy_id)
  where status = 'requested';

create trigger loan_requests_set_updated_at
before update on public.loan_requests
for each row execute function public.set_updated_at();

alter table public.loan_requests enable row level security;

create policy "Borrowers and lenders can view requests"
  on public.loan_requests for select
  using (borrower_id = auth.uid() or lender_id = auth.uid());

create policy "Approved members can request listed copies"
  on public.loan_requests for insert
  with check (
    borrower_id = auth.uid()
    and public.is_approved_community_member(community_id)
    and public.is_approved_community_member(community_id, lender_id)
    and exists (
      select 1
      from public.physical_copies copy
      join public.copy_community_listings listing on listing.copy_id = copy.id
      where copy.id = copy_id
        and copy.owner_id = lender_id
        and copy.availability = 'available'
        and copy.visibility = 'community'
        and listing.community_id = loan_requests.community_id
        and listing.is_active
    )
  );

create policy "Borrowers can cancel requested loans"
  on public.loan_requests for update
  using (borrower_id = auth.uid() and status = 'requested')
  with check (borrower_id = auth.uid() and status = 'cancelled');

create policy "Lenders can respond to requests"
  on public.loan_requests for update
  using (lender_id = auth.uid() and status = 'requested')
  with check (lender_id = auth.uid() and status in ('approved', 'declined'));

create or replace function public.create_loan_request(
  requested_copy_id uuid,
  requested_community_id uuid,
  request_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_request_id uuid;
  copy_owner_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_approved_community_member(requested_community_id) then raise exception 'Approved community membership required'; end if;

  select copy.owner_id into copy_owner_id
  from public.physical_copies copy
  join public.copy_community_listings listing on listing.copy_id = copy.id
  where copy.id = requested_copy_id
    and listing.community_id = requested_community_id
    and listing.is_active
    and copy.visibility = 'community'
    and copy.availability = 'available'
  for update of copy;

  if copy_owner_id is null then raise exception 'This book is no longer available'; end if;
  if copy_owner_id = auth.uid() then raise exception 'You cannot request your own book'; end if;

  insert into public.loan_requests (copy_id, community_id, borrower_id, lender_id, message)
  values (requested_copy_id, requested_community_id, auth.uid(), copy_owner_id, nullif(trim(request_message), ''))
  returning id into new_request_id;

  return new_request_id;
exception
  when unique_violation then
    raise exception 'This book already has a pending request';
end;
$$;

create or replace function public.respond_to_loan_request(
  target_request_id uuid,
  decision public.loan_request_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_copy_id uuid;
  target_lender_id uuid;
begin
  if decision not in ('approved', 'declined') then raise exception 'Invalid lender decision'; end if;

  select copy_id, lender_id into target_copy_id, target_lender_id
  from public.loan_requests
  where id = target_request_id and status = 'requested'
  for update;

  if target_copy_id is null then raise exception 'Request is no longer pending'; end if;
  if target_lender_id <> auth.uid() then raise exception 'Only the lender can respond'; end if;

  if decision = 'approved' then
    update public.physical_copies
    set availability = 'reserved'
    where id = target_copy_id and availability = 'available';
    if not found then raise exception 'This book is no longer available'; end if;
  end if;

  update public.loan_requests
  set status = decision, responded_at = timezone('utc', now())
  where id = target_request_id;
end;
$$;

create or replace function public.cancel_loan_request(target_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.loan_requests
  set status = 'cancelled', cancelled_at = timezone('utc', now())
  where id = target_request_id
    and borrower_id = auth.uid()
    and status = 'requested';
  if not found then raise exception 'Only a pending request can be cancelled'; end if;
end;
$$;
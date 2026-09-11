create type public.loan_status as enum ('approved', 'picked_up', 'due_soon', 'overdue', 'returned', 'closed', 'cancelled');

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.loan_requests(id) on delete restrict,
  copy_id uuid not null references public.physical_copies(id) on delete restrict,
  community_id uuid not null references public.communities(id) on delete restrict,
  lender_id uuid not null references public.profiles(id) on delete restrict,
  borrower_id uuid not null references public.profiles(id) on delete restrict,
  status public.loan_status not null default 'approved',
  pickup_confirmed_by_lender_at timestamptz,
  pickup_confirmed_by_borrower_at timestamptz,
  picked_up_at timestamptz,
  due_at timestamptz,
  returned_confirmed_by_lender_at timestamptz,
  returned_confirmed_by_borrower_at timestamptz,
  returned_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (lender_id <> borrower_id)
);

create table public.loan_status_events (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  from_status public.loan_status,
  to_status public.loan_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create index loans_lender_idx on public.loans (lender_id, status);
create index loans_borrower_idx on public.loans (borrower_id, status);
create index loans_due_idx on public.loans (status, due_at);
create index loan_status_events_loan_idx on public.loan_status_events (loan_id, created_at);

create trigger loans_set_updated_at
before update on public.loans
for each row execute function public.set_updated_at();

alter table public.loans enable row level security;
alter table public.loan_status_events enable row level security;

create policy "Loan participants can view loans"
  on public.loans for select
  using (lender_id = auth.uid() or borrower_id = auth.uid());

create policy "Loan participants can view status history"
  on public.loan_status_events for select
  using (exists (select 1 from public.loans where id = loan_id and (lender_id = auth.uid() or borrower_id = auth.uid())));

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
  target_borrower_id uuid;
  target_community_id uuid;
  new_loan_id uuid;
begin
  if decision not in ('approved', 'declined') then raise exception 'Invalid lender decision'; end if;

  select copy_id, lender_id, borrower_id, community_id
  into target_copy_id, target_lender_id, target_borrower_id, target_community_id
  from public.loan_requests
  where id = target_request_id and status = 'requested'
  for update;

  if target_copy_id is null then raise exception 'Request is no longer pending'; end if;
  if target_lender_id <> auth.uid() then raise exception 'Only the lender can respond'; end if;

  if decision = 'approved' then
    update public.physical_copies set availability = 'reserved'
    where id = target_copy_id and availability = 'available';
    if not found then raise exception 'This book is no longer available'; end if;

    update public.loan_requests set status = 'approved', responded_at = timezone('utc', now()) where id = target_request_id;
    insert into public.loans (request_id, copy_id, community_id, lender_id, borrower_id)
    values (target_request_id, target_copy_id, target_community_id, target_lender_id, target_borrower_id)
    returning id into new_loan_id;
    insert into public.loan_status_events (loan_id, to_status, changed_by, reason)
    values (new_loan_id, 'approved', auth.uid(), 'Lender approved request');
    return;
  end if;

  update public.loan_requests set status = 'declined', responded_at = timezone('utc', now()) where id = target_request_id;
  return;
end;
$$;

create or replace function public.confirm_loan_pickup(target_loan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_loan public.loans%rowtype;
  next_status public.loan_status;
begin
  select * into current_loan from public.loans where id = target_loan_id for update;
  if current_loan.id is null then raise exception 'Loan not found'; end if;
  if current_loan.status <> 'approved' then raise exception 'Pickup can only be confirmed for an approved loan'; end if;
  if auth.uid() = current_loan.lender_id then
    update public.loans set pickup_confirmed_by_lender_at = coalesce(pickup_confirmed_by_lender_at, timezone('utc', now())) where id = target_loan_id;
  elsif auth.uid() = current_loan.borrower_id then
    update public.loans set pickup_confirmed_by_borrower_at = coalesce(pickup_confirmed_by_borrower_at, timezone('utc', now())) where id = target_loan_id;
  else raise exception 'Only loan participants can confirm pickup'; end if;

  select * into current_loan from public.loans where id = target_loan_id;
  if current_loan.pickup_confirmed_by_lender_at is not null and current_loan.pickup_confirmed_by_borrower_at is not null then
    update public.loans set status = 'picked_up', picked_up_at = timezone('utc', now()), due_at = timezone('utc', now()) + interval '14 days' where id = target_loan_id;
    update public.physical_copies set availability = 'lent' where id = current_loan.copy_id;
    next_status := 'picked_up';
    insert into public.loan_status_events (loan_id, from_status, to_status, changed_by, reason) values (target_loan_id, 'approved', next_status, auth.uid(), 'Both parties confirmed pickup');
  end if;
end;
$$;

create or replace function public.update_loan_due_states()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare updated_count integer;
begin
  update public.loans set status = 'overdue'
  where status in ('picked_up', 'due_soon') and due_at < timezone('utc', now());
  get diagnostics updated_count = row_count;
  insert into public.loan_status_events (loan_id, from_status, to_status, reason)
  select id, case when status = 'overdue' then 'picked_up'::public.loan_status else status end, 'overdue', 'Due date passed'
  from public.loans where status = 'overdue' and updated_at >= timezone('utc', now()) - interval '1 minute';

  update public.loans set status = 'due_soon'
  where status = 'picked_up' and due_at between timezone('utc', now()) and timezone('utc', now()) + interval '3 days';
  return updated_count;
end;
$$;

create or replace function public.confirm_loan_return(target_loan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare current_loan public.loans%rowtype;
begin
  select * into current_loan from public.loans where id = target_loan_id for update;
  if current_loan.id is null then raise exception 'Loan not found'; end if;
  if current_loan.status not in ('picked_up', 'due_soon', 'overdue') then raise exception 'Return cannot be confirmed in this state'; end if;
  if auth.uid() = current_loan.lender_id then
    update public.loans set returned_confirmed_by_lender_at = coalesce(returned_confirmed_by_lender_at, timezone('utc', now())) where id = target_loan_id;
  elsif auth.uid() = current_loan.borrower_id then
    update public.loans set returned_confirmed_by_borrower_at = coalesce(returned_confirmed_by_borrower_at, timezone('utc', now())) where id = target_loan_id;
  else raise exception 'Only loan participants can confirm return'; end if;

  select * into current_loan from public.loans where id = target_loan_id;
  if current_loan.returned_confirmed_by_lender_at is not null and current_loan.returned_confirmed_by_borrower_at is not null then
    update public.loans set status = 'returned', returned_at = timezone('utc', now()) where id = target_loan_id;
    update public.physical_copies set availability = 'available' where id = current_loan.copy_id;
    insert into public.loan_status_events (loan_id, from_status, to_status, changed_by, reason) values (target_loan_id, current_loan.status, 'returned', auth.uid(), 'Both parties confirmed return');
  end if;
end;
$$;

create or replace function public.close_loan(target_loan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.loans set status = 'closed', closed_at = timezone('utc', now())
  where id = target_loan_id and status = 'returned' and (lender_id = auth.uid() or borrower_id = auth.uid());
  if not found then raise exception 'Only a returned loan can be closed by a participant'; end if;
  insert into public.loan_status_events (loan_id, from_status, to_status, changed_by, reason) values (target_loan_id, 'returned', 'closed', auth.uid(), 'Loan closed');
end;
$$;
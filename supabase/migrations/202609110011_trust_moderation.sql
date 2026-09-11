create type public.report_target_type as enum ('member', 'listing', 'transaction');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.rating_value as enum ('positive', 'neutral', 'negative');

create table public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  target_type public.report_target_type not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_copy_id uuid references public.physical_copies(id) on delete set null,
  target_loan_id uuid references public.loans(id) on delete set null,
  reason text not null,
  details text,
  status public.report_status not null default 'open',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.transaction_ratings (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  rating public.rating_value not null,
  feedback text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (loan_id, from_user_id),
  check (from_user_id <> to_user_id)
);

create index reports_community_status_idx on public.reports (community_id, status, created_at desc);
create index ratings_recipient_idx on public.transaction_ratings (to_user_id, created_at desc);

alter table public.blocked_users enable row level security;
alter table public.reports enable row level security;
alter table public.transaction_ratings enable row level security;

create policy "Users can manage their blocks"
  on public.blocked_users for all
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

create policy "Users can create reports"
  on public.reports for insert
  with check (reporter_id = auth.uid() and public.is_approved_community_member(community_id));

create policy "Reporters and community admins can view reports"
  on public.reports for select
  using (reporter_id = auth.uid() or public.is_community_admin(community_id));

create policy "Community admins can update reports"
  on public.reports for update
  using (public.is_community_admin(community_id))
  with check (public.is_community_admin(community_id));

create policy "Loan participants can manage ratings"
  on public.transaction_ratings for select
  using (from_user_id = auth.uid() or to_user_id = auth.uid() or exists (select 1 from public.loans where id = loan_id and (lender_id = auth.uid() or borrower_id = auth.uid())));

create policy "Participants can create ratings for closed loans"
  on public.transaction_ratings for insert
  with check (
    from_user_id = auth.uid()
    and exists (
      select 1 from public.loans loan
      where loan.id = loan_id
        and loan.status = 'closed'
        and (loan.lender_id = auth.uid() or loan.borrower_id = auth.uid())
        and (to_user_id = loan.lender_id or to_user_id = loan.borrower_id)
        and to_user_id <> auth.uid()
    )
  );
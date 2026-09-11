create type public.notification_type as enum (
  'request_created',
  'request_approved',
  'request_declined',
  'request_cancelled',
  'pickup_confirmed',
  'due_soon',
  'due_today',
  'overdue',
  'return_confirmed',
  'loan_closed'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  request_id uuid references public.loan_requests(id) on delete cascade,
  loan_id uuid references public.loans(id) on delete cascade,
  dedupe_key text not null unique,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id, read_at) where read_at is null;

alter table public.notifications enable row level security;

create policy "Users can view their notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users can mark their notifications read"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.create_notification(
  target_user_id uuid,
  notification_type public.notification_type,
  notification_title text,
  notification_body text,
  notification_request_id uuid,
  notification_loan_id uuid,
  notification_dedupe_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, request_id, loan_id, dedupe_key)
  values (target_user_id, notification_type, notification_title, notification_body, notification_request_id, notification_loan_id, notification_dedupe_key)
  on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function public.notify_request_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.create_notification(new.lender_id, 'request_created', 'New book request', 'Someone requested one of your books.', new.id, null, 'request-created:' || new.id::text);
  elsif new.status = 'approved' and old.status <> 'approved' then
    perform public.create_notification(new.borrower_id, 'request_approved', 'Request approved', 'Your book request was approved. Coordinate pickup with the lender.', new.id, null, 'request-approved:' || new.id::text);
  elsif new.status = 'declined' and old.status <> 'declined' then
    perform public.create_notification(new.borrower_id, 'request_declined', 'Request declined', 'Your book request was declined.', new.id, null, 'request-declined:' || new.id::text);
  elsif new.status = 'cancelled' and old.status <> 'cancelled' then
    perform public.create_notification(new.lender_id, 'request_cancelled', 'Request cancelled', 'A borrower cancelled their book request.', new.id, null, 'request-cancelled:' || new.id::text);
  end if;
  return new;
end;
$$;

create trigger loan_requests_notify_change
after insert or update of status on public.loan_requests
for each row execute function public.notify_request_change();

create or replace function public.notify_loan_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'picked_up' and (tg_op = 'INSERT' or old.status <> 'picked_up') then
    perform public.create_notification(new.borrower_id, 'pickup_confirmed', 'Pickup confirmed', 'Both parties confirmed pickup. Your 14-day lending period has started.', null, new.id, 'pickup-confirmed:borrower:' || new.id::text);
    perform public.create_notification(new.lender_id, 'pickup_confirmed', 'Pickup confirmed', 'Both parties confirmed pickup. The 14-day lending period has started.', null, new.id, 'pickup-confirmed:lender:' || new.id::text);
  elsif new.status = 'returned' and old.status <> 'returned' then
    perform public.create_notification(new.borrower_id, 'return_confirmed', 'Return confirmed', 'Both parties confirmed that the book was returned.', null, new.id, 'return-confirmed:borrower:' || new.id::text);
    perform public.create_notification(new.lender_id, 'return_confirmed', 'Return confirmed', 'Both parties confirmed that the book was returned.', null, new.id, 'return-confirmed:lender:' || new.id::text);
  elsif new.status = 'closed' and old.status <> 'closed' then
    perform public.create_notification(new.borrower_id, 'loan_closed', 'Loan closed', 'This book loan is now closed.', null, new.id, 'loan-closed:borrower:' || new.id::text);
    perform public.create_notification(new.lender_id, 'loan_closed', 'Loan closed', 'This book loan is now closed.', null, new.id, 'loan-closed:lender:' || new.id::text);
  end if;
  return new;
end;
$$;

create trigger loans_notify_change
after insert or update of status on public.loans
for each row execute function public.notify_loan_change();

create or replace function public.process_loan_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  processed_count integer := 0;
  loan_record public.loans%rowtype;
begin
  update public.loans
  set status = 'overdue'
  where status in ('picked_up', 'due_soon') and due_at < timezone('utc', now());

  for loan_record in select * from public.loans where status in ('picked_up', 'due_soon', 'overdue') and due_at is not null loop
    if loan_record.status = 'overdue' then
      perform public.create_notification(loan_record.borrower_id, 'overdue', 'Book overdue', 'A borrowed book is overdue. Please arrange its return.', null, loan_record.id, 'overdue:borrower:' || loan_record.id::text || ':' || to_char(loan_record.due_at, 'YYYY-MM-DD'));
      perform public.create_notification(loan_record.lender_id, 'overdue', 'Book overdue', 'A lent book is overdue. Please arrange its return.', null, loan_record.id, 'overdue:lender:' || loan_record.id::text || ':' || to_char(loan_record.due_at, 'YYYY-MM-DD'));
      processed_count := processed_count + 1;
    elsif loan_record.due_at <= timezone('utc', now()) + interval '3 days' then
      update public.loans set status = 'due_soon' where id = loan_record.id and status = 'picked_up';
      perform public.create_notification(loan_record.borrower_id, 'due_soon', 'Book due soon', 'A borrowed book is due within three days.', null, loan_record.id, 'due-soon:borrower:' || loan_record.id::text || ':' || to_char(loan_record.due_at, 'YYYY-MM-DD'));
      perform public.create_notification(loan_record.lender_id, 'due_soon', 'Book due soon', 'A lent book is due within three days.', null, loan_record.id, 'due-soon:lender:' || loan_record.id::text || ':' || to_char(loan_record.due_at, 'YYYY-MM-DD'));
      processed_count := processed_count + 1;
    end if;
  end loop;
  return processed_count;
end;
$$;
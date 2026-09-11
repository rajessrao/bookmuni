create table public.copy_photos (
  id uuid primary key default gen_random_uuid(),
  copy_id uuid not null references public.physical_copies(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index copy_photos_copy_idx on public.copy_photos (copy_id);
alter table public.copy_photos enable row level security;

create policy "Owners can view copy photos"
  on public.copy_photos for select
  using (exists (select 1 from public.physical_copies copy where copy.id = copy_id and copy.owner_id = auth.uid()));

create policy "Owners can manage copy photos"
  on public.copy_photos for all
  using (exists (select 1 from public.physical_copies copy where copy.id = copy_id and copy.owner_id = auth.uid()))
  with check (exists (select 1 from public.physical_copies copy where copy.id = copy_id and copy.owner_id = auth.uid()));

insert into storage.buckets (id, name, public)
values ('bookmuni-covers', 'bookmuni-covers', true), ('bookmuni-copy-photos', 'bookmuni-copy-photos', false)
on conflict (id) do nothing;

create policy "Users can upload their book covers"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'bookmuni-covers' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update their book covers"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'bookmuni-covers' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'bookmuni-covers' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can upload their copy photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'bookmuni-copy-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can manage their copy photos"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'bookmuni-copy-photos' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'bookmuni-copy-photos' and auth.uid()::text = (storage.foldername(name))[1]);
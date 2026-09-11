create type public.copy_visibility as enum ('private', 'community');
create type public.copy_availability as enum ('private', 'available', 'reserved', 'lent', 'unavailable');

create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 300),
  author text not null check (char_length(trim(author)) between 1 and 200),
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(author, ''))
  ) stored,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.editions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  isbn text,
  publisher text,
  edition_label text,
  publication_year integer check (publication_year between 1000 and extract(year from now())::integer + 1),
  language text not null,
  cover_image_path text,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index editions_isbn_unique_idx
  on public.editions (isbn)
  where isbn is not null;
create index books_search_idx on public.books using gin (search_vector);
create index editions_book_idx on public.editions (book_id);

create table public.physical_copies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  edition_id uuid references public.editions(id) on delete set null,
  title text not null,
  author text not null,
  condition text not null check (char_length(trim(condition)) between 1 and 80),
  language text not null,
  genre text not null,
  visibility public.copy_visibility not null default 'private',
  availability public.copy_availability not null default 'private',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index physical_copies_owner_idx on public.physical_copies (owner_id);
create index physical_copies_discovery_idx on public.physical_copies (availability, genre, language);

create table public.copy_community_listings (
  copy_id uuid not null references public.physical_copies(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (copy_id, community_id)
);

create index copy_listings_community_idx on public.copy_community_listings (community_id, is_active);

create trigger physical_copies_set_updated_at
before update on public.physical_copies
for each row execute function public.set_updated_at();

alter table public.books enable row level security;
alter table public.editions enable row level security;
alter table public.physical_copies enable row level security;
alter table public.copy_community_listings enable row level security;

create policy "Owners can view their copies"
  on public.physical_copies for select
  using (owner_id = auth.uid());

create policy "Approved members can view available copies"
  on public.physical_copies for select
  using (
    availability = 'available'
    and visibility = 'community'
    and exists (
      select 1
      from public.copy_community_listings listing
      where listing.copy_id = physical_copies.id
        and listing.is_active
        and public.is_approved_community_member(listing.community_id)
    )
  );

create policy "Owners can create copies"
  on public.physical_copies for insert
  with check (owner_id = auth.uid());

create policy "Owners can update copies"
  on public.physical_copies for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owners can delete copies"
  on public.physical_copies for delete
  using (owner_id = auth.uid());

create policy "Users can view relevant books"
  on public.books for select
  using (
    exists (
      select 1 from public.physical_copies copy
      where copy.edition_id in (select id from public.editions where book_id = books.id)
        and (
          copy.owner_id = auth.uid()
          or exists (
            select 1 from public.copy_community_listings listing
            where listing.copy_id = copy.id
              and listing.is_active
              and copy.availability = 'available'
              and copy.visibility = 'community'
              and public.is_approved_community_member(listing.community_id)
          )
        )
    )
  );

create policy "Users can view relevant editions"
  on public.editions for select
  using (
    exists (
      select 1 from public.physical_copies copy
      where copy.edition_id = editions.id
        and (
          copy.owner_id = auth.uid()
          or exists (
            select 1 from public.copy_community_listings listing
            where listing.copy_id = copy.id
              and listing.is_active
              and copy.availability = 'available'
              and copy.visibility = 'community'
              and public.is_approved_community_member(listing.community_id)
          )
        )
    )
  );

create policy "Members can view active listings"
  on public.copy_community_listings for select
  using (is_active and public.is_approved_community_member(community_id));

create policy "Owners can manage listings"
  on public.copy_community_listings for all
  using (exists (select 1 from public.physical_copies where id = copy_id and owner_id = auth.uid()))
  with check (exists (select 1 from public.physical_copies where id = copy_id and owner_id = auth.uid()));

create or replace function public.create_physical_copy(
  copy_title text,
  copy_author text,
  copy_condition text,
  copy_language text,
  copy_genre text,
  copy_visibility public.copy_visibility,
  copy_isbn text,
  copy_publisher text,
  copy_edition_label text,
  copy_publication_year integer,
  copy_cover_image_path text,
  copy_notes text,
  selected_community_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_book_id uuid;
  new_edition_id uuid;
  new_copy_id uuid;
  selected_community_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if trim(copy_title) = '' or trim(copy_author) = '' then raise exception 'Title and author are required'; end if;
  if copy_visibility = 'community' and coalesce(array_length(selected_community_ids, 1), 0) = 0 then
    raise exception 'Select at least one approved community';
  end if;

  if copy_isbn is not null and trim(copy_isbn) <> '' then
    select id into new_edition_id from public.editions where isbn = trim(copy_isbn);
  end if;

  if new_edition_id is null then
    insert into public.books (title, author) values (trim(copy_title), trim(copy_author)) returning id into new_book_id;
    insert into public.editions (book_id, isbn, publisher, edition_label, publication_year, language, cover_image_path)
    values (new_book_id, nullif(trim(copy_isbn), ''), nullif(trim(copy_publisher), ''), nullif(trim(copy_edition_label), ''), copy_publication_year, trim(copy_language), nullif(trim(copy_cover_image_path), ''))
    returning id into new_edition_id;
  end if;

  insert into public.physical_copies (owner_id, edition_id, title, author, condition, language, genre, visibility, availability, notes)
  values (auth.uid(), new_edition_id, trim(copy_title), trim(copy_author), trim(copy_condition), trim(copy_language), trim(copy_genre), copy_visibility, (case when copy_visibility = 'private' then 'private' else 'available' end)::public.copy_availability, nullif(trim(copy_notes), ''))
  returning id into new_copy_id;

  if copy_visibility = 'community' then
    foreach selected_community_id in array selected_community_ids loop
      if not public.is_approved_community_member(selected_community_id) then
        raise exception 'You can only list books in approved communities';
      end if;
      insert into public.copy_community_listings (copy_id, community_id) values (new_copy_id, selected_community_id);
    end loop;
  end if;

  return new_copy_id;
end;
$$;
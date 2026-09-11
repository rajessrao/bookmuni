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
    insert into public.books (title, author)
    values (trim(copy_title), trim(copy_author))
    returning id into new_book_id;

    insert into public.editions (book_id, isbn, publisher, edition_label, publication_year, language, cover_image_path)
    values (
      new_book_id,
      nullif(trim(copy_isbn), ''),
      nullif(trim(copy_publisher), ''),
      nullif(trim(copy_edition_label), ''),
      copy_publication_year,
      trim(copy_language),
      nullif(trim(copy_cover_image_path), '')
    )
    returning id into new_edition_id;
  end if;

  insert into public.physical_copies (owner_id, edition_id, title, author, condition, language, genre, visibility, availability, notes)
  values (
    auth.uid(),
    new_edition_id,
    trim(copy_title),
    trim(copy_author),
    trim(copy_condition),
    trim(copy_language),
    trim(copy_genre),
    copy_visibility,
    (case when copy_visibility = 'private' then 'private' else 'available' end)::public.copy_availability,
    nullif(trim(copy_notes), '')
  )
  returning id into new_copy_id;

  if copy_visibility = 'community' then
    foreach selected_community_id in array selected_community_ids loop
      if not public.is_approved_community_member(selected_community_id) then
        raise exception 'You can only list books in approved communities';
      end if;
      insert into public.copy_community_listings (copy_id, community_id)
      values (new_copy_id, selected_community_id);
    end loop;
  end if;

  return new_copy_id;
end;
$$;
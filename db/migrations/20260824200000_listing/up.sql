create table listing (
  id uuid primary key default gen_random_uuid(),
  books_id uuid not null references books (id) on delete restrict,
  listing_spend integer not null check (listing_spend >= 0),
  notes text,
  ended boolean not null default false
);

create index listing_books_id_idx on listing (books_id);
create index listing_books_ended_idx on listing (books_id, ended);

create table listing_flip (
  books_id uuid not null references books (id) on delete restrict,
  listing_id uuid not null references listing (id) on delete restrict,
  flip_id uuid not null references flip (id) on delete restrict,
  primary key (listing_id, flip_id)
);

create index listing_flip_books_id_idx on listing_flip (books_id);
create index listing_flip_flip_id_idx on listing_flip (flip_id);

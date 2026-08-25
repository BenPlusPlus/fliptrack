alter table flip
  add column parent_flip_id uuid references flip (id) on delete restrict,
  add column retired boolean not null default false;

create index flip_parent_flip_id_idx on flip (parent_flip_id);

create table tag (
  id uuid primary key default gen_random_uuid(),
  books_id uuid not null references books (id) on delete restrict,
  name text not null
);

create unique index tag_books_name_lower_uq on tag (books_id, lower(name));
create index tag_books_id_idx on tag (books_id);

create table flip_tag (
  books_id uuid not null references books (id) on delete restrict,
  flip_id uuid not null references flip (id) on delete restrict,
  tag_id uuid not null references tag (id) on delete cascade,
  primary key (flip_id, tag_id)
);

create index flip_tag_books_id_idx on flip_tag (books_id);
create index flip_tag_tag_id_idx on flip_tag (tag_id);

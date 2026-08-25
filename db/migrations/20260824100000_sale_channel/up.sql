create table channel (
  id uuid primary key default gen_random_uuid(),
  books_id uuid not null references books (id) on delete restrict,
  name text not null
);

create unique index channel_books_name_lower_uq on channel (books_id, lower(name));
create index channel_books_id_idx on channel (books_id);

create table sale (
  id uuid primary key default gen_random_uuid(),
  books_id uuid not null references books (id) on delete restrict,
  channel_id uuid not null references channel (id) on delete restrict,
  sale_date date not null,
  sale_price integer not null check (sale_price >= 0),
  buyer_paid_shipping integer not null check (buyer_paid_shipping >= 0),
  marketplace_fee integer not null check (marketplace_fee >= 0),
  outbound_shipping integer not null check (outbound_shipping >= 0),
  supplies integer not null check (supplies >= 0),
  notes text
);

create index sale_books_id_idx on sale (books_id);
create index sale_channel_id_idx on sale (channel_id);
create index sale_books_sale_date_idx on sale (books_id, sale_date);

create table sale_flip (
  books_id uuid not null references books (id) on delete restrict,
  sale_id uuid not null references sale (id) on delete restrict,
  flip_id uuid not null references flip (id) on delete restrict,
  undone boolean not null default false,
  -- Leftover Marketplace fee / Outbound shipping / Supplies snapshotted at undo.
  hitch_marketplace_fee integer check (hitch_marketplace_fee is null or hitch_marketplace_fee >= 0),
  hitch_outbound_shipping integer check (hitch_outbound_shipping is null or hitch_outbound_shipping >= 0),
  hitch_supplies integer check (hitch_supplies is null or hitch_supplies >= 0),
  primary key (sale_id, flip_id)
);

create unique index sale_flip_one_standing_uq on sale_flip (flip_id) where undone = false;
create index sale_flip_books_id_idx on sale_flip (books_id);
create index sale_flip_flip_id_idx on sale_flip (flip_id);

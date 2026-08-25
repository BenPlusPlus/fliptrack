create table write_off (
  id uuid primary key default gen_random_uuid(),
  books_id uuid not null references books (id) on delete restrict,
  write_off_date date not null,
  outbound_shipping integer not null check (outbound_shipping >= 0),
  supplies integer not null check (supplies >= 0),
  notes text
);

create index write_off_books_id_idx on write_off (books_id);
create index write_off_books_write_off_date_idx on write_off (books_id, write_off_date);

create table write_off_flip (
  books_id uuid not null references books (id) on delete restrict,
  write_off_id uuid not null references write_off (id) on delete restrict,
  flip_id uuid not null references flip (id) on delete restrict,
  undone boolean not null default false,
  -- Leftover Marketplace fee / Outbound shipping / Supplies snapshotted at undo.
  hitch_marketplace_fee integer check (hitch_marketplace_fee is null or hitch_marketplace_fee >= 0),
  hitch_outbound_shipping integer check (hitch_outbound_shipping is null or hitch_outbound_shipping >= 0),
  hitch_supplies integer check (hitch_supplies is null or hitch_supplies >= 0),
  primary key (write_off_id, flip_id)
);

create unique index write_off_flip_one_standing_uq on write_off_flip (flip_id) where undone = false;
create index write_off_flip_books_id_idx on write_off_flip (books_id);
create index write_off_flip_flip_id_idx on write_off_flip (flip_id);

create function enforce_one_standing_realizing()
returns trigger
language plpgsql
as $$
begin
  if new.undone then
    return new;
  end if;
  if tg_table_name = 'sale_flip' then
    if exists (
      select 1
      from write_off_flip
      where flip_id = new.flip_id
        and undone = false
    ) then
      raise exception 'A Flip has at most one standing Sale or one standing Write-off';
    end if;
  elsif tg_table_name = 'write_off_flip' then
    if exists (
      select 1
      from sale_flip
      where flip_id = new.flip_id
        and undone = false
    ) then
      raise exception 'A Flip has at most one standing Sale or one standing Write-off';
    end if;
  end if;
  return new;
end;
$$;

create trigger sale_flip_one_standing_realizing
  before insert or update on sale_flip
  for each row execute function enforce_one_standing_realizing();

create trigger write_off_flip_one_standing_realizing
  before insert or update on write_off_flip
  for each row execute function enforce_one_standing_realizing();

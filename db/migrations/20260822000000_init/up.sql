create table books (
  id uuid primary key default gen_random_uuid()
);

create table instance_settings (
  singleton boolean primary key default true check (singleton),
  signup_open boolean not null default false
);

insert into instance_settings (singleton, signup_open) values (true, false);

create table operator (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  instance_admin boolean not null default false,
  must_change_password boolean not null default false,
  credentials_changed_at timestamptz not null,
  books_id uuid not null unique references books (id) on delete restrict
);

create unique index operator_email_lower_uq on operator (lower(email));
create unique index operator_one_instance_admin_uq on operator (instance_admin) where instance_admin;

create table acquisition (
  id uuid primary key default gen_random_uuid(),
  books_id uuid not null references books (id) on delete restrict,
  acquisition_date date not null,
  notes text
);

create index acquisition_books_id_idx on acquisition (books_id);

create table flip (
  id uuid primary key default gen_random_uuid(),
  books_id uuid not null references books (id) on delete restrict,
  acquisition_id uuid not null references acquisition (id) on delete restrict,
  name text not null,
  notes text,
  item_cost integer not null check (item_cost >= 0),
  tax_paid integer not null check (tax_paid >= 0),
  inbound_shipping integer not null check (inbound_shipping >= 0)
);

create index flip_books_id_idx on flip (books_id);
create index flip_acquisition_id_idx on flip (acquisition_id);

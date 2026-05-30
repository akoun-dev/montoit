-- Add new feature columns to properties table

alter table properties
  add column if not exists has_balcony boolean not null default false,
  add column if not exists has_terrace boolean not null default false,
  add column if not exists has_kitchen boolean not null default false,
  add column if not exists has_box boolean not null default false;

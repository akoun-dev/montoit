-- The mandat signature route (src/app/api/mandats/[id]/sign/route.ts) reads and
-- writes contract_url, owner_signature_image, agency_signature_image and
-- cryptoneo_operation_id on `mandats`, but the original migration never
-- defined those columns — every signature attempt failed with a Postgres
-- "column does not exist" error. Add them, mirroring the equivalent columns
-- already present on `leases`.

alter table mandats
  add column if not exists contract_url text,
  add column if not exists owner_signature_image text,
  add column if not exists agency_signature_image text,
  add column if not exists cryptoneo_operation_id text;

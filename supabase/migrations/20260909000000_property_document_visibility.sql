alter table property_documents
  add column if not exists is_published boolean not null default true;

create index if not exists idx_property_documents_published
  on property_documents (property_id, is_published);

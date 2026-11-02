-- Add tenant rating and review columns to visit_requests
-- Allows tenants to leave feedback on completed property visits

alter table visit_requests
  add column if not exists tenant_rating integer check (tenant_rating >= 1 and tenant_rating <= 5),
  add column if not exists tenant_review text;

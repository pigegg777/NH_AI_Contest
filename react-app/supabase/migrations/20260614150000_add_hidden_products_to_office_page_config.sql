-- Phase 1b: per-office hidden product list (wizard Q1).
alter table public.office_page_config
  add column if not exists hidden_products jsonb not null default '[]'::jsonb;

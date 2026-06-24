grant select on public.static_fertilizers to anon, authenticated;

alter table public.static_fertilizers enable row level security;

drop policy if exists "static_fertilizers_select_public" on public.static_fertilizers;

create policy "static_fertilizers_select_public" on public.static_fertilizers
  for select to anon, authenticated
  using (true);

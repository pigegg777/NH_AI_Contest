-- Phase 1a demo seed data for the customer storefront (?tool=store&office=DEMO-0001).
-- Idempotent: safe to run multiple times.

-- 1. Demo login user (owns the demo office's product data row).
insert into public.login_users (nh_name, office_name, office_code, name, employee_id)
select '데모농협', '데모 매장', 'DEMO-0001', '데모 계정', 'demo-store-seed'
where not exists (
  select 1 from public.login_users where employee_id = 'demo-store-seed'
);

-- 2. Demo product catalog for office_code = 'DEMO-0001'.
insert into public.office_product_datas (office_code, office_name, product_data, updated_who)
values (
  'DEMO-0001',
  '데모 매장',
  jsonb_build_array(
    jsonb_build_object(
      'category_name', '비료',
      'updated_at', now(),
      'row_count', 3,
      'source_file_name', 'demo-seed.xlsx',
      'rows', jsonb_build_array(
        jsonb_build_object(
          'product_name', '복합비료 21-17-17',
          'spec', '20kg',
          'large_category', '비료',
          'medium_category', '복합',
          'small_category', '21-17-17',
          'detail_category', null,
          'nutrient', '질소 21%, 인산 17%, 칼리 17%',
          'img_url', null,
          'product_url', null,
          'tax_price', 28000
        ),
        jsonb_build_object(
          'product_name', '복합비료 15-15-15',
          'spec', '20kg',
          'large_category', '비료',
          'medium_category', '복합',
          'small_category', '15-15-15',
          'detail_category', null,
          'nutrient', '질소 15%, 인산 15%, 칼리 15%',
          'img_url', null,
          'product_url', null,
          'tax_price', 25000
        ),
        jsonb_build_object(
          'product_name', '요소비료',
          'spec', '20kg',
          'large_category', '비료',
          'medium_category', '단일',
          'small_category', '요소',
          'detail_category', null,
          'nutrient', '질소 46%',
          'img_url', null,
          'product_url', null,
          'tax_price', 22000
        )
      )
    )
  ),
  (select id from public.login_users where employee_id = 'demo-store-seed')
)
on conflict (office_code) do update
  set office_name = excluded.office_name,
      product_data = excluded.product_data,
      updated_who = excluded.updated_who;

-- 3. Demo page config: card fields + section order matching the categories above.
insert into public.office_page_config (office_code, selected_categories, card_config, nav_config, section_order)
values (
  'DEMO-0001',
  jsonb_build_array(
    jsonb_build_object('large_category', '비료', 'medium_category', '복합'),
    jsonb_build_object('large_category', '비료', 'medium_category', '단일')
  ),
  jsonb_build_object('fields', jsonb_build_array('product_name', 'spec', 'nutrient', 'tax_price')),
  '{}'::jsonb,
  jsonb_build_array(
    jsonb_build_object(
      'category_ref', jsonb_build_object('large_category', '비료', 'medium_category', '복합'),
      'display_variant', 'card-grid'
    ),
    jsonb_build_object(
      'category_ref', jsonb_build_object('large_category', '비료', 'medium_category', '단일'),
      'display_variant', 'card-grid'
    )
  )
)
on conflict (office_code) do update
  set selected_categories = excluded.selected_categories,
      card_config = excluded.card_config,
      nav_config = excluded.nav_config,
      section_order = excluded.section_order;

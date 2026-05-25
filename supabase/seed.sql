-- FluxMenu initial Supabase seed data
-- Run after supabase/schema.sql.
-- Uses fixed UUIDs to make local/dev tests predictable.

-- -----------------------------------------------------------------------------
-- Restaurants
-- -----------------------------------------------------------------------------

insert into public.restaurants (id, name, slug, status)
values
  ('11111111-1111-4111-8111-111111111111', 'Gusto & Charcoal', 'gusto-charcoal', 'active'),
  ('22222222-2222-4222-8222-222222222222', 'Bistro Aurora', 'bistro-aurora', 'active')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  status = excluded.status,
  updated_at = now();

insert into public.restaurant_settings (
  id,
  restaurant_id,
  display_name,
  rating_label,
  delivery_estimate,
  address,
  instagram,
  phone,
  primary_color
)
values
  (
    '11111111-aaaa-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'Gusto & Charcoal',
    '4.9',
    '15-25 min',
    'Alameda Lorena, 1420 - Jardins, São Paulo - SP',
    '@gustocharcoal',
    null,
    '#f97316'
  ),
  (
    '22222222-aaaa-4222-8222-222222222222',
    '22222222-2222-4222-8222-222222222222',
    'Bistro Aurora',
    '4.8',
    '12-22 min',
    'Rua Harmonia, 890 - Vila Madalena, São Paulo - SP',
    '@bistroaurora',
    '(11) 4002-2026',
    '#2563eb'
  )
on conflict (restaurant_id) do update set
  display_name = excluded.display_name,
  rating_label = excluded.rating_label,
  delivery_estimate = excluded.delivery_estimate,
  address = excluded.address,
  instagram = excluded.instagram,
  phone = excluded.phone,
  primary_color = excluded.primary_color,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- Categories
-- -----------------------------------------------------------------------------

insert into public.categories (id, restaurant_id, slug, name, sort_order, active)
values
  ('10000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'entradas', 'Entradas', 1, true),
  ('10000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'hamburgueres', 'Hambúrgueres', 2, true),
  ('10000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'pizzas', 'Pizzas', 3, true),
  ('10000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'bebidas', 'Bebidas', 4, true),
  ('10000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'sobremesas', 'Sobremesas', 5, true),
  ('20000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'entradas', 'Entradas', 1, true),
  ('20000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'hamburgueres', 'Hambúrgueres', 2, true),
  ('20000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'pizzas', 'Pizzas', 3, true),
  ('20000000-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', 'bebidas', 'Bebidas', 4, true),
  ('20000000-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'sobremesas', 'Sobremesas', 5, true)
on conflict (restaurant_id, slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- Products
-- -----------------------------------------------------------------------------

insert into public.products (
  id,
  restaurant_id,
  category_id,
  name,
  description,
  price,
  image_url,
  prep_time_minutes,
  available,
  active
)
values
  (
    '11000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    '10000000-0000-4000-8000-000000000001',
    'Coxinhas de Costela Premium (4 unid.)',
    'Massa finíssima de batata baroa, recheada com costela premium desfiada e catupiry original. Acompanha geleia artesanal de pimenta defumada.',
    36.00,
    'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop&q=80',
    10,
    true,
    true
  ),
  (
    '11000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    '10000000-0000-4000-8000-000000000001',
    'Fritas Rústicas com Grana Padano & Alecrim',
    'Batatas rústicas com corte artesanal, fritas na temperatura perfeita, polvilhadas com queijo Grana Padano italiano ralado na hora e alecrim fresco.',
    29.00,
    'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80',
    8,
    true,
    true
  ),
  (
    '11000000-0000-4000-8000-000000000003',
    '11111111-1111-4111-8111-111111111111',
    '10000000-0000-4000-8000-000000000002',
    'Alquimia Charcoal Burger',
    'Blend bovino Angus na brasa de 160g, cheddar inglês derretido, bacon artesanal caramelizado, cebola roxa e maionese defumada no pão de brioche tostado.',
    46.00,
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
    15,
    true,
    true
  ),
  (
    '11000000-0000-4000-8000-000000000004',
    '11111111-1111-4111-8111-111111111111',
    '10000000-0000-4000-8000-000000000002',
    'Triple Smash Cheddar',
    'Três burgers ultra smash de 70g com crostinha na chapa, queijo cheddar entre cada camada, cebola picadinha, picles e molho secreto no pão brioche.',
    49.00,
    'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80',
    12,
    true,
    true
  ),
  (
    '11000000-0000-4000-8000-000000000005',
    '11111111-1111-4111-8111-111111111111',
    '10000000-0000-4000-8000-000000000003',
    'Margherita Especialle Al Tartufo',
    'Massa napolitana de fermentação lenta, molho de tomate San Marzano, muçarela de búfala fresca, manjericão e azeite trufado.',
    68.00,
    'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500&auto=format&fit=crop&q=80',
    18,
    true,
    true
  ),
  (
    '11000000-0000-4000-8000-000000000006',
    '11111111-1111-4111-8111-111111111111',
    '10000000-0000-4000-8000-000000000004',
    'Soda Artesanal de Frutas Vermelhas & Limão Siciliano',
    'Redução de mirtilo, amora e morango, água com gás purificada e rodelas frescas de limão siciliano.',
    16.00,
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
    4,
    true,
    true
  ),
  (
    '11000000-0000-4000-8000-000000000007',
    '11111111-1111-4111-8111-111111111111',
    '10000000-0000-4000-8000-000000000005',
    'Grand Gateau de Ninho com Morangos',
    'Gateau quente de chocolate belga com creme de leite Ninho, picolé de baunilha, chocolate e morangos frescos.',
    34.00,
    'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&auto=format&fit=crop&q=80',
    10,
    true,
    true
  ),
  (
    '22000000-0000-4000-8000-000000000001',
    '22222222-2222-4222-8222-222222222222',
    '20000000-0000-4000-8000-000000000001',
    'Bruschetta Aurora de Tomates Assados',
    'Pão artesanal tostado com tomates confitados, manjericão fresco, azeite extravirgem e flor de sal.',
    28.00,
    'https://images.unsplash.com/photo-1572449043416-55f4685c9bb7?w=500&auto=format&fit=crop&q=80',
    8,
    true,
    true
  ),
  (
    '22000000-0000-4000-8000-000000000002',
    '22222222-2222-4222-8222-222222222222',
    '20000000-0000-4000-8000-000000000003',
    'Pizza Aurora de Burrata e Parma',
    'Massa fina de fermentação natural com burrata cremosa, presunto parma, rúcula e redução balsâmica.',
    72.00,
    'https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=500&auto=format&fit=crop&q=80',
    17,
    true,
    true
  ),
  (
    '22000000-0000-4000-8000-000000000003',
    '22222222-2222-4222-8222-222222222222',
    '20000000-0000-4000-8000-000000000004',
    'Limonada Siciliana com Hortelã',
    'Limão siciliano, folhas frescas de hortelã, água com gás e xarope artesanal leve.',
    15.00,
    'https://images.unsplash.com/photo-1523371054106-bbf80586c38c?w=500&auto=format&fit=crop&q=80',
    4,
    true,
    true
  ),
  (
    '22000000-0000-4000-8000-000000000004',
    '22222222-2222-4222-8222-222222222222',
    '20000000-0000-4000-8000-000000000005',
    'Tiramisù Clássico da Casa',
    'Camadas de mascarpone, café espresso, cacau belga e biscoito champagne embebido na medida certa.',
    31.00,
    'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=80',
    6,
    true,
    true
  )
on conflict (id) do update set
  restaurant_id = excluded.restaurant_id,
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  image_url = excluded.image_url,
  prep_time_minutes = excluded.prep_time_minutes,
  available = excluded.available,
  active = excluded.active,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- Restaurant tables
-- -----------------------------------------------------------------------------

insert into public.restaurant_tables (id, restaurant_id, label, slug, active, sort_order)
values
  ('11110000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Mesa 01', 'mesa-01', true, 1),
  ('11110000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Mesa 02', 'mesa-02', true, 2),
  ('11110000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Mesa 03', 'mesa-03', true, 3),
  ('11110000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'Mesa 04', 'mesa-04', true, 4),
  ('11110000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'Mesa 05', 'mesa-05', true, 5),
  ('11110000-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'Mesa 08', 'mesa-08', true, 8),
  ('11110000-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111', 'Mesa 12', 'mesa-12', true, 12),
  ('11110000-0000-4000-8000-000000000015', '11111111-1111-4111-8111-111111111111', 'Mesa 15', 'mesa-15', true, 15),
  ('11110000-0000-4000-8000-000000000099', '11111111-1111-4111-8111-111111111111', 'Mesa VIP', 'mesa-vip', true, 99),
  ('22220000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Mesa 01', 'mesa-01', true, 1),
  ('22220000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'Mesa 02', 'mesa-02', true, 2),
  ('22220000-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', 'Mesa 06', 'mesa-06', true, 6),
  ('22220000-0000-4000-8000-000000000009', '22222222-2222-4222-8222-222222222222', 'Mesa 09', 'mesa-09', true, 9),
  ('22220000-0000-4000-8000-000000000090', '22222222-2222-4222-8222-222222222222', 'Mesa Varanda', 'mesa-varanda', true, 90),
  ('22220000-0000-4000-8000-000000000091', '22222222-2222-4222-8222-222222222222', 'Balcão 01', 'balcao-01', true, 91)
on conflict (restaurant_id, slug) do update set
  label = excluded.label,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- Test subscriptions
-- The schema allows one active/trialing/past_due subscription per restaurant.
-- Starter and Pro are active examples; Premium is kept as canceled history.
-- -----------------------------------------------------------------------------

insert into public.subscriptions (
  id,
  restaurant_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  trial_ends_at,
  provider,
  provider_subscription_id
)
values
  (
    'aaaa0000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'starter',
    'active',
    now(),
    now() + interval '30 days',
    null,
    'seed',
    'seed_starter_gusto'
  ),
  (
    'aaaa0000-0000-4000-8000-000000000002',
    '22222222-2222-4222-8222-222222222222',
    'pro',
    'active',
    now(),
    now() + interval '30 days',
    null,
    'seed',
    'seed_pro_bistro'
  ),
  (
    'aaaa0000-0000-4000-8000-000000000003',
    '11111111-1111-4111-8111-111111111111',
    'premium',
    'canceled',
    now() - interval '60 days',
    now() - interval '30 days',
    null,
    'seed',
    'seed_premium_history_gusto'
  )
on conflict (id) do update set
  restaurant_id = excluded.restaurant_id,
  plan_id = excluded.plan_id,
  status = excluded.status,
  current_period_start = excluded.current_period_start,
  current_period_end = excluded.current_period_end,
  trial_ends_at = excluded.trial_ends_at,
  provider = excluded.provider,
  provider_subscription_id = excluded.provider_subscription_id,
  updated_at = now();

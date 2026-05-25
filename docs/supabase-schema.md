# Supabase Schema Proposal

Documento tecnico para futura integracao do FluxMenu com Supabase. Esta proposta nao implementa backend ainda; ela define o modelo de dados, relacoes, seguranca multi-tenant e caminho recomendado de migracao.

## Objetivos

- Suportar SaaS multi-restaurante usando isolamento por `restaurant_id`.
- Manter dados operacionais separados por restaurante.
- Permitir usuarios vinculados a restaurantes com papeis e permissoes.
- Persistir planos, assinaturas, produtos, categorias, mesas, pedidos e configuracoes.
- Preparar Row Level Security (RLS) para que um restaurante nunca leia dados de outro.
- Permitir migracao gradual a partir dos mocks/localStorage atuais.

## Convencoes

- Usar `uuid` como chave primaria na maioria das tabelas.
- Usar `restaurant_id` como foreign key para todas as tabelas tenant-scoped.
- Usar `created_at` e `updated_at` em tabelas mutaveis.
- Preferir `numeric(10,2)` para valores monetarios.
- Preferir enums ou check constraints para status, roles e planos.
- Em TypeScript, o atual `restaurantId` deve mapear para `restaurant_id` no banco.

## Tabelas Minimas

### 1. restaurants

Representa o tenant principal do SaaS.

Campos sugeridos:

| Campo | Tipo | Obrigatorio | Observacao |
|---|---:|---:|---|
| id | uuid | sim | PK. Equivale ao `restaurantId` da aplicacao. |
| name | text | sim | Nome publico/comercial. |
| slug | text | sim | Identificador amigavel unico para URLs futuras. |
| status | text | sim | `active`, `inactive`, `suspended`. |
| owner_profile_id | uuid | nao | FK para `profiles.id`, dono principal. |
| created_at | timestamptz | sim | Default `now()`. |
| updated_at | timestamptz | sim | Atualizado por trigger. |

Relacoes:

- `restaurants.id` -> `restaurant_settings.restaurant_id`
- `restaurants.id` -> `subscriptions.restaurant_id`
- `restaurants.id` -> `products.restaurant_id`
- `restaurants.id` -> `categories.restaurant_id`
- `restaurants.id` -> `orders.restaurant_id`
- `restaurants.id` -> `tables.restaurant_id`
- `restaurants.id` -> `restaurant_members.restaurant_id`

Indices:

- unique `restaurants.slug`
- index `restaurants.status`

### 2. restaurant_settings

Configuracoes visuais e operacionais do restaurante.

Campos sugeridos:

| Campo | Tipo | Obrigatorio | Observacao |
|---|---:|---:|---|
| id | uuid | sim | PK. |
| restaurant_id | uuid | sim | FK para `restaurants.id`. Unique. |
| display_name | text | sim | Nome exibido na interface. |
| rating_label | text | nao | Ex: `4.9`, pode ser removido no futuro. |
| delivery_estimate | text | nao | Ex: `15-25 min`. |
| address | text | nao | Endereco publico. |
| instagram | text | nao | Perfil social. |
| phone | text | nao | Telefone comercial. |
| logo_url | text | nao | Futuro branding. |
| primary_color | text | nao | Futuro tema por restaurante. |
| created_at | timestamptz | sim | Default `now()`. |
| updated_at | timestamptz | sim | Trigger. |

Relacoes:

- `restaurant_settings.restaurant_id` -> `restaurants.id`

Indices:

- unique `restaurant_settings.restaurant_id`

### 3. plans

Catalogo dos planos SaaS. Deve espelhar a configuracao atual em `src/config/plans.ts`.

Campos sugeridos:

| Campo | Tipo | Obrigatorio | Observacao |
|---|---:|---:|---|
| id | text | sim | PK: `starter`, `pro`, `premium`. |
| name | text | sim | Nome comercial. |
| price_cents | integer | sim | Preco em centavos. |
| currency | text | sim | Ex: `BRL`. |
| billing_period | text | sim | Ex: `monthly`. |
| features | jsonb | sim | Mapa de funcionalidades booleanas. |
| limits | jsonb | sim | Mapa de limites numericos. `-1` indica ilimitado. |
| active | boolean | sim | Permite ocultar planos antigos. |
| created_at | timestamptz | sim | Default `now()`. |
| updated_at | timestamptz | sim | Trigger. |

Features atuais sugeridas:

- `analytics`
- `ai`
- `multiple_units`
- `multi_user_rbac`
- `remove_fluxmenu_branding`
- `advanced_customization`
- `advanced_permissions`

Limites atuais sugeridos:

- `maxProducts` ou remover se continuar ilimitado
- `maxTables` ou remover se continuar ilimitado
- `maxStaffUsers`
- `maxOrdersPerMonth` ou remover se continuar ilimitado
- `maxRestaurants`

Indices:

- PK em `plans.id`
- index `plans.active`

### 4. subscriptions

Assinatura ativa do restaurante.

Campos sugeridos:

| Campo | Tipo | Obrigatorio | Observacao |
|---|---:|---:|---|
| id | uuid | sim | PK. |
| restaurant_id | uuid | sim | FK para `restaurants.id`. |
| plan_id | text | sim | FK para `plans.id`. |
| status | text | sim | `trialing`, `active`, `past_due`, `canceled`. |
| current_period_start | timestamptz | nao | Inicio do ciclo. |
| current_period_end | timestamptz | nao | Fim do ciclo. |
| trial_ends_at | timestamptz | nao | Trial. |
| provider | text | nao | Futuro: Stripe, Asaas, Mercado Pago etc. |
| provider_subscription_id | text | nao | ID externo do gateway. |
| created_at | timestamptz | sim | Default `now()`. |
| updated_at | timestamptz | sim | Trigger. |

Relacoes:

- `subscriptions.restaurant_id` -> `restaurants.id`
- `subscriptions.plan_id` -> `plans.id`

Indices:

- index `subscriptions.restaurant_id`
- index `subscriptions.plan_id`
- index `subscriptions.status`
- unique parcial recomendado para assinatura ativa por restaurante:
  - unique `restaurant_id` where `status in ('trialing', 'active', 'past_due')`

### 5. users/profiles

No Supabase, autenticacao fica em `auth.users`. A tabela `profiles` guarda dados publicos/operacionais do usuario.

Campos sugeridos para `profiles`:

| Campo | Tipo | Obrigatorio | Observacao |
|---|---:|---:|---|
| id | uuid | sim | PK e FK para `auth.users.id`. |
| name | text | sim | Nome exibido. |
| email | text | sim | Pode espelhar `auth.users.email`. |
| avatar_url | text | nao | Avatar. |
| created_at | timestamptz | sim | Default `now()`. |
| updated_at | timestamptz | sim | Trigger. |

Usuarios por restaurante devem ficar em uma tabela de associacao.

### 6. restaurant_members

Vincula usuarios a restaurantes. Esta tabela substitui o mock atual de usuarios por restaurante.

Campos sugeridos:

| Campo | Tipo | Obrigatorio | Observacao |
|---|---:|---:|---|
| id | uuid | sim | PK. |
| restaurant_id | uuid | sim | FK para `restaurants.id`. |
| profile_id | uuid | sim | FK para `profiles.id`. |
| role | text | sim | `owner`, `manager`, `kitchen`, `cashier`, `waiter`, `customer`. |
| active | boolean | sim | Se o vinculo esta ativo. |
| created_at | timestamptz | sim | Default `now()`. |
| updated_at | timestamptz | sim | Trigger. |

Relacoes:

- `restaurant_members.restaurant_id` -> `restaurants.id`
- `restaurant_members.profile_id` -> `profiles.id`

Indices:

- unique `restaurant_members(restaurant_id, profile_id)`
- index `restaurant_members.profile_id`
- index `restaurant_members.restaurant_id`
- index `restaurant_members(role)`

### 7. permissions e role_permissions

Para o MVP, permissoes podem continuar no frontend como configuracao. Para um SaaS real, recomenda-se persistir permissoes por role e, futuramente, overrides por usuario.

Tabela sugerida: `role_permissions`

| Campo | Tipo | Obrigatorio | Observacao |
|---|---:|---:|---|
| id | uuid | sim | PK. |
| restaurant_id | uuid | nao | Null para permissao global default; preenchido para override por restaurante. |
| role | text | sim | Mesmo enum de role. |
| permissions | jsonb | sim | Ex: `canEditProducts`, `canUpdateKDS`, etc. |
| allowed_modes | text[] | sim | Ex: `client`, `kitchen`, `cashier`, `admin`, `split`. |
| created_at | timestamptz | sim | Default `now()`. |
| updated_at | timestamptz | sim | Trigger. |

Tabela opcional futura: `member_permission_overrides`

| Campo | Tipo | Obrigatorio | Observacao |
|---|---:|---:|---|
| id | uuid | sim | PK. |
| restaurant_member_id | uuid | sim | FK para `restaurant_members.id`. |
| permissions | jsonb | sim | Overrides granulares. |
| created_at | timestamptz | sim | Default `now()`. |
| updated_at | timestamptz | sim | Trigger. |

### 8. categories

Categorias por restaurante.

Campos sugeridos:

| Campo | Tipo | Obrigatorio | Observacao |
|---|---:|---:|---|
| id | uuid | sim | PK. |
| restaurant_id | uuid | sim | FK para `restaurants.id`. |
| slug | text | sim | Ex: `entradas`, `bebidas`. |
| name | text | sim | Nome exibido. |
| sort_order | integer | sim | Ordenacao no menu. |
| active | boolean | sim | Visivel no cardapio. |
| created_at | timestamptz | sim | Default `now()`. |
| updated_at | timestamptz | sim | Trigger. |

Relacoes:

- `categories.restaurant_id` -> `restaurants.id`
- `products.category_id` -> `categories.id`

Indices:

- unique `categories(restaurant_id, slug)`
- index `categories(restaurant_id, active, sort_order)`

### 9. products

Produtos do cardapio por restaurante.

Campos sugeridos:

| Campo | Tipo | Obrigatorio | Observacao |
|---|---:|---:|---|
| id | uuid | sim | PK. |
| restaurant_id | uuid | sim | FK para `restaurants.id`. |
| category_id | uuid | sim | FK para `categories.id`. |
| name | text | sim | Nome do produto. |
| description | text | nao | Descricao comercial. |
| price | numeric(10,2) | sim | Preco atual. |
| image_url | text | nao | Imagem. |
| prep_time_minutes | integer | sim | Tempo estimado. |
| available | boolean | sim | Disponibilidade. |
| active | boolean | sim | Soft delete/visibilidade administrativa. |
| created_at | timestamptz | sim | Default `now()`. |
| updated_at | timestamptz | sim | Trigger. |

Relacoes:

- `products.restaurant_id` -> `restaurants.id`
- `products.category_id` -> `categories.id`

Indices:

- index `products(restaurant_id, available, active)`
- index `products(restaurant_id, category_id)`
- index GIN opcional para busca por texto em `name`/`description`

Observacao importante:

`order_items` deve salvar snapshot de `name` e `price`, pois produtos podem mudar depois do pedido.

### 10. tables

Mesas/locais por restaurante. O nome `tables` pode conflitar conceitualmente com tabela SQL, mas e aceitavel. Alternativa: `restaurant_tables`.

Campos sugeridos:

| Campo | Tipo | Obrigatorio | Observacao |
|---|---:|---:|---|
| id | uuid | sim | PK. |
| restaurant_id | uuid | sim | FK para `restaurants.id`. |
| label | text | sim | Ex: `Mesa 08`, `Balcao 01`. |
| slug | text | sim | Ex: `mesa-08`, usado em QR. |
| active | boolean | sim | Se aparece no sistema. |
| sort_order | integer | nao | Ordenacao. |
| created_at | timestamptz | sim | Default `now()`. |
| updated_at | timestamptz | sim | Trigger. |

Relacoes:

- `tables.restaurant_id` -> `restaurants.id`
- `orders.table_id` -> `tables.id` opcional

Indices:

- unique `tables(restaurant_id, slug)`
- index `tables(restaurant_id, active)`

### 11. orders

Pedido/comanda enviada pelo cliente, garcom ou operador.

Campos sugeridos:

| Campo | Tipo | Obrigatorio | Observacao |
|---|---:|---:|---|
| id | uuid | sim | PK. |
| public_code | text | sim | Ex: `#1024`, exibido na UI. |
| restaurant_id | uuid | sim | FK para `restaurants.id`. |
| table_id | uuid | nao | FK para `tables.id`. |
| table_label_snapshot | text | sim | Snapshot do nome da mesa. |
| status | text | sim | `novo`, `preparo`, `pronto`, `entregue`, futuro `cancelado`. |
| priority | text | sim | `baixa`, `media`, `alta`, `urgente`. |
| notes | text | nao | Notas gerais. |
| subtotal | numeric(10,2) | sim | Soma dos itens. |
| total | numeric(10,2) | sim | Total final do pedido. |
| payment_status | text | sim | `pendente`, `pago`, futuro `parcial`, `cancelado`. |
| payment_method | text | nao | `pix`, `credito`, `debito`, `dinheiro`. |
| created_by_profile_id | uuid | nao | Usuario que criou, se houver. |
| created_at | timestamptz | sim | Default `now()`. |
| updated_at | timestamptz | sim | Trigger. |
| paid_at | timestamptz | nao | Quando foi pago. |

Relacoes:

- `orders.restaurant_id` -> `restaurants.id`
- `orders.table_id` -> `tables.id`
- `orders.created_by_profile_id` -> `profiles.id`
- `order_items.order_id` -> `orders.id`

Indices:

- index `orders(restaurant_id, status, created_at desc)`
- index `orders(restaurant_id, payment_status)`
- index `orders(restaurant_id, table_id, payment_status)`
- index `orders(restaurant_id, public_code)`

### 12. order_items

Itens de cada pedido.

Campos sugeridos:

| Campo | Tipo | Obrigatorio | Observacao |
|---|---:|---:|---|
| id | uuid | sim | PK. |
| restaurant_id | uuid | sim | FK para `restaurants.id`, redundante para RLS/indices. |
| order_id | uuid | sim | FK para `orders.id`. |
| product_id | uuid | nao | FK para `products.id`, nullable se produto foi removido. |
| product_name_snapshot | text | sim | Nome no momento da compra. |
| unit_price_snapshot | numeric(10,2) | sim | Preco no momento da compra. |
| quantity | integer | sim | Quantidade. |
| observation | text | nao | Observacoes e alertas. |
| total | numeric(10,2) | sim | `quantity * unit_price_snapshot`. |
| created_at | timestamptz | sim | Default `now()`. |

Relacoes:

- `order_items.restaurant_id` -> `restaurants.id`
- `order_items.order_id` -> `orders.id`
- `order_items.product_id` -> `products.id`

Indices:

- index `order_items(order_id)`
- index `order_items(restaurant_id, created_at desc)`
- index `order_items(product_id)`

## Tabelas Opcionais Recomendadas

### payment_logs

O sistema atual possui `PaymentLog`. Em Supabase, recomenda-se criar tabela propria.

Campos:

- `id uuid primary key`
- `restaurant_id uuid not null references restaurants(id)`
- `table_id uuid null references tables(id)`
- `table_label_snapshot text not null`
- `amount numeric(10,2) not null`
- `payment_method text not null`
- `items_count integer not null`
- `order_ids uuid[] not null`
- `operator_profile_id uuid null references profiles(id)`
- `created_at timestamptz not null default now()`

Indices:

- index `payment_logs(restaurant_id, created_at desc)`
- index `payment_logs(restaurant_id, payment_method)`

### audit_logs

Para operacao real, principalmente caixa/admin.

Campos:

- `id uuid primary key`
- `restaurant_id uuid not null references restaurants(id)`
- `actor_profile_id uuid null references profiles(id)`
- `action text not null`
- `entity_type text not null`
- `entity_id uuid null`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

## Uso de restaurant_id

Toda tabela operacional deve ter `restaurant_id`:

- `restaurant_settings`
- `subscriptions`
- `restaurant_members`
- `categories`
- `products`
- `tables`
- `orders`
- `order_items`
- `payment_logs`
- `audit_logs`

Mesmo quando `restaurant_id` parece derivavel via FK, como em `order_items -> orders`, manter `restaurant_id` facilita:

- RLS simples e performatica.
- Indices por tenant.
- Queries diretas sem joins obrigatorios.
- Auditoria e investigacao de dados.

Regra: o backend deve sempre validar que entidades relacionadas pertencem ao mesmo `restaurant_id`.

## Estrutura de Planos e Assinaturas

Modelo recomendado:

- `plans` guarda o catalogo comercial e tecnico.
- `subscriptions` liga restaurante ao plano atual.
- `plans.features` define acesso booleano.
- `plans.limits` define limites numericos.
- `-1` pode continuar significando ilimitado.

Exemplo de `features`:

```json
{
  "analytics": true,
  "ai": false,
  "multiple_units": false,
  "multi_user_rbac": true,
  "remove_fluxmenu_branding": true,
  "advanced_customization": false,
  "advanced_permissions": false
}
```

Exemplo de `limits`:

```json
{
  "maxProducts": -1,
  "maxTables": -1,
  "maxStaffUsers": 15,
  "maxOrdersPerMonth": -1,
  "maxRestaurants": 1
}
```

No frontend, as funcoes atuais `canUseFeature()` e `getPlanLimit()` podem futuramente ler de um `subscriptionService`, que consulta Supabase e cacheia localmente.

## Usuarios por Restaurante

Fluxo recomendado:

1. Usuario existe em `auth.users`.
2. Trigger cria/atualiza `profiles`.
3. Convite ou onboarding cria linha em `restaurant_members`.
4. A aplicacao carrega os restaurantes do usuario via `restaurant_members`.
5. O `activeRestaurantId` deve ser escolhido entre restaurantes permitidos ao usuario.

Importante:

- Um mesmo `profile_id` pode pertencer a multiplos restaurantes.
- O papel deve ser por restaurante, nao global.
- Permissoes avancadas podem ser derivadas de `role_permissions` e `member_permission_overrides`.

## Estrategia de Seguranca Multi-Tenant

### Row Level Security

Ativar RLS em todas as tabelas tenant-scoped.

Padrao conceitual de policy:

```sql
exists (
  select 1
  from restaurant_members rm
  where rm.restaurant_id = <table>.restaurant_id
    and rm.profile_id = auth.uid()
    and rm.active = true
)
```

Para `profiles`:

- Usuario pode ler o proprio profile.
- Usuario pode ler profiles que compartilham restaurante via `restaurant_members`.

Para `restaurants`:

- Usuario pode ler restaurantes onde e membro ativo.

Para `products`, `categories`, `tables`, `orders`, `order_items`:

- Leitura permitida para membros ativos do restaurante.
- Escrita permitida conforme role/permissao.

### Roles sugeridos

- `owner`: tudo no restaurante.
- `manager`: catalogo, mesas, pedidos, caixa, configuracoes basicas.
- `kitchen`: leitura de pedidos e atualizacao KDS.
- `cashier`: leitura de pedidos e operacoes de pagamento.
- `waiter`: criar pedidos e acompanhar mesas.
- `customer`: no futuro, acesso restrito ou anonimo por QR.

### Operacoes anonimas por QR

Para cardapio publico:

- Produtos/categorias/tables podem ter policies publicas somente para leitura de restaurantes ativos, se necessario.
- Criacao de pedido anonima deve ser feita com cuidado.
- Recomendacao: usar Edge Function ou RPC controlada para `create_order_from_qr`, validando restaurante, mesa ativa, produtos disponiveis e totais.

### Validacoes importantes

- Produto de `order_items.product_id` deve pertencer ao mesmo `restaurant_id` do pedido.
- Mesa do pedido deve pertencer ao mesmo `restaurant_id`.
- Usuario operador deve ser membro ativo do restaurante.
- Checkout deve operar apenas pedidos do mesmo `restaurant_id` e mesma mesa.

## Indices Importantes

Minimos recomendados:

```sql
create index idx_restaurant_members_profile on restaurant_members(profile_id);
create index idx_restaurant_members_restaurant on restaurant_members(restaurant_id);
create unique index idx_restaurant_members_unique on restaurant_members(restaurant_id, profile_id);

create unique index idx_categories_restaurant_slug on categories(restaurant_id, slug);
create index idx_categories_restaurant_active_sort on categories(restaurant_id, active, sort_order);

create index idx_products_restaurant_active_available on products(restaurant_id, active, available);
create index idx_products_restaurant_category on products(restaurant_id, category_id);

create unique index idx_tables_restaurant_slug on tables(restaurant_id, slug);
create index idx_tables_restaurant_active on tables(restaurant_id, active);

create index idx_orders_restaurant_status_created on orders(restaurant_id, status, created_at desc);
create index idx_orders_restaurant_payment on orders(restaurant_id, payment_status);
create index idx_orders_restaurant_table_payment on orders(restaurant_id, table_id, payment_status);
create index idx_orders_restaurant_public_code on orders(restaurant_id, public_code);

create index idx_order_items_order on order_items(order_id);
create index idx_order_items_restaurant_created on order_items(restaurant_id, created_at desc);
create index idx_order_items_product on order_items(product_id);

create index idx_payment_logs_restaurant_created on payment_logs(restaurant_id, created_at desc);
create index idx_subscriptions_restaurant on subscriptions(restaurant_id);
create index idx_subscriptions_status on subscriptions(status);
```

## Fluxo Recomendado de Migracao Gradual

### Fase 1: Preparar contratos no frontend

- Manter repositories locais existentes.
- Definir interfaces equivalentes ao schema Supabase.
- Criar DTO mappers entre camelCase do frontend e snake_case do banco.
- Garantir que services nao acessem localStorage/mocks diretamente.

### Fase 2: Criar schema Supabase sem conectar UI

- Criar tabelas base.
- Popular `plans` com `starter`, `pro`, `premium`.
- Popular restaurantes mockados atuais.
- Popular categorias/produtos/pedidos iniciais para ambiente dev.
- Criar triggers de `updated_at`.

### Fase 3: Implementar autenticao minima

- Habilitar Supabase Auth.
- Criar `profiles` e trigger de profile.
- Criar `restaurant_members` para donos/operadores.
- Ainda nao mudar toda UI; apenas validar sessao e restaurante ativo.

### Fase 4: Migrar leitura por modulo

Ordem sugerida:

1. Restaurantes e settings.
2. Planos e assinatura.
3. Categorias e produtos.
4. Mesas.
5. Pedidos e itens.
6. Pagamentos/logs.
7. Permissoes.

Cada modulo deve substituir apenas o repository local por repository Supabase, mantendo services e componentes estaveis.

### Fase 5: Migrar escrita por modulo

Ordem sugerida:

1. Configuracoes do restaurante.
2. Produtos/categorias.
3. Mesas.
4. Criacao de pedidos.
5. Atualizacao KDS.
6. Checkout/pagamento.

### Fase 6: Ativar RLS em modo restritivo

- Comecar em ambiente dev/staging.
- Testar usuarios de restaurantes diferentes.
- Testar roles diferentes no mesmo restaurante.
- Garantir que nenhum select sem `restaurant_id` vaze dados.

### Fase 7: Realtime

- Usar Supabase Realtime para `orders` e `order_items`.
- KDS pode assinar pedidos por `restaurant_id` e status ativo.
- Caixa pode assinar pedidos e pagamentos por `restaurant_id`.

### Fase 8: Remover mocks/localStorage operacional

- Manter mocks apenas para testes/storybook/dev fallback.
- Dados reais passam a vir dos repositories Supabase.
- `localStorage` fica apenas para preferencias locais: `activeRestaurantId`, ultimo modo, tema etc.

## Observacoes Finais

- A estrutura atual do frontend ja caminha para uma boa migracao: components -> services -> repositories.
- A futura troca ideal e substituir repositories locais por repositories Supabase, preservando services.
- O ponto mais importante e manter `restaurant_id` obrigatorio e validado em todas as operacoes operacionais.
- RLS deve ser tratada como requisito central, nao como melhoria posterior.

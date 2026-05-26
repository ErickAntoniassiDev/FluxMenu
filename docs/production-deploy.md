# FluxMenu production deploy runbook

Este guia descreve a ordem segura para publicar o FluxMenu em producao usando Supabase, Supabase Edge Functions, Vercel e Asaas.

## 0. Decisoes recomendadas

- Frontend: Vercel Pro para dominio, preview deployments, rollback e SSL automatico.
- Backend: Supabase Pro para evitar pausa do projeto e ter backups gerenciados.
- Billing: Asaas producao, nao sandbox.
- DNS: Cloudflare ou DNS do proprio registrador; usar Vercel como destino do app.
- Monitoramento: UptimeRobot ou Better Stack para uptime; logs nativos de Vercel e Supabase no inicio.

## 1. Checklist antes do deploy

- Projeto Supabase de producao criado.
- URL e anon key de producao separadas do sandbox/dev.
- Asaas producao homologado e API key de producao criada.
- Dominio comprado e acesso ao DNS disponivel.
- RLS aplicada e testada.
- Edge Functions com secrets configurados.
- Webhook Asaas apontando para producao.
- `npm run lint` e `npm run build` passando localmente.
- Conta owner real criada para teste final.

## 2. Variaveis de ambiente

### Frontend Vercel

Configurar em Production, Preview e Development se necessario:

```sh
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase_anon_key>
```

Nunca configurar `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` ou `SUPABASE_SERVICE_ROLE_KEY` no frontend.

### Supabase Edge Functions secrets

Producao Asaas:

```sh
supabase secrets set ASAAS_BASE_URL=https://api.asaas.com/v3
supabase secrets set ASAAS_API_KEY=<asaas_api_key_producao>
supabase secrets set ASAAS_WEBHOOK_TOKEN=<token_forte_gerado_por_voce>
supabase secrets set ASAAS_TRIAL_DAYS=14
supabase secrets set ASAAS_BILLING_TYPE=UNDEFINED
supabase secrets set SUPABASE_URL=https://<project-ref>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<supabase_service_role_key>
```

Opcional para restringir webhook por IP quando a lista estiver validada:

```sh
supabase secrets set ASAAS_WEBHOOK_ALLOWED_IPS=<ip1>,<ip2>,<ip3>
```

## 3. Ordem correta de banco

Em um projeto novo de producao, aplicar nesta ordem:

```sh
psql "$SUPABASE_DB_URL" -f supabase/schema.sql
psql "$SUPABASE_DB_URL" -f supabase/rls-policies.sql
psql "$SUPABASE_DB_URL" -f supabase/asaas-billing.sql
psql "$SUPABASE_DB_URL" -f supabase/admin-management.sql
psql "$SUPABASE_DB_URL" -f supabase/payment-rpc.sql
psql "$SUPABASE_DB_URL" -f supabase/order-rpc.sql
psql "$SUPABASE_DB_URL" -f supabase/onboarding-rpc.sql
psql "$SUPABASE_DB_URL" -f supabase/multi-tenant-security.sql
psql "$SUPABASE_DB_URL" -f supabase/feature-gating.sql
```

Para banco ja existente, fazer backup antes e aplicar somente migracoes ainda nao aplicadas. `seed.sql` deve ficar restrito a desenvolvimento.

## 4. Deploy das Edge Functions

Instalar/logar/linkar:

```sh
supabase login
supabase projects list
supabase link --project-ref <project-ref>
```

Deploy:

```sh
supabase functions deploy asaas-billing
supabase functions deploy asaas-webhook --no-verify-jwt
```

`asaas-billing` deve manter JWT ativo, pois e chamada pelo usuario autenticado. `asaas-webhook` precisa de `--no-verify-jwt`, porque quem chama e o Asaas; a seguranca vem do token `asaas-access-token` validado pela function.

URLs finais:

```text
Billing API:  https://<project-ref>.supabase.co/functions/v1/asaas-billing
Webhook API:  https://<project-ref>.supabase.co/functions/v1/asaas-webhook
```

## 5. Configurar webhook no Asaas

No painel Asaas producao, criar webhook com:

```text
URL: https://<project-ref>.supabase.co/functions/v1/asaas-webhook
Token/header: mesmo valor de ASAAS_WEBHOOK_TOKEN
```

Eventos recomendados:

- `PAYMENT_CREATED`
- `PAYMENT_CONFIRMED`
- `PAYMENT_RECEIVED`
- `PAYMENT_OVERDUE`
- `PAYMENT_DELETED`
- `PAYMENT_RESTORED`
- `PAYMENT_REFUNDED`
- `SUBSCRIPTION_CREATED`
- `SUBSCRIPTION_UPDATED`
- `SUBSCRIPTION_DELETED`

Depois enviar um evento de teste pelo painel Asaas e confirmar entrada em `billing_events`.

## 6. Deploy frontend na Vercel

Instalar e autenticar:

```sh
npm ci
npm run lint
npm run build
npx vercel login
npx vercel link
```

Adicionar envs:

```sh
npx vercel env add VITE_SUPABASE_URL production
npx vercel env add VITE_SUPABASE_ANON_KEY production
npx vercel env add VITE_SUPABASE_URL preview
npx vercel env add VITE_SUPABASE_ANON_KEY preview
```

Deploy producao:

```sh
npx vercel --prod
```

O arquivo `vercel.json` ja contem rewrite para SPA e rotas publicas `/r/:restaurantSlug/:tableSlug`.

## 7. Dominio e SSL

Na Vercel:

```sh
npx vercel domains add seudominio.com.br
npx vercel domains add www.seudominio.com.br
```

No DNS, usar os registros que a Vercel mostrar. Normalmente:

```text
A      @      76.76.21.21
CNAME  www    cname.vercel-dns.com
```

Aguardar propagacao e verificar:

```sh
dig seudominio.com.br +short
dig www.seudominio.com.br +short
curl -I https://seudominio.com.br
```

SSL e renovacao sao automaticos na Vercel depois que o dominio validar.

## 8. Configuracoes Supabase Auth

No Dashboard Supabase > Authentication > URL Configuration:

```text
Site URL: https://seudominio.com.br
Redirect URLs:
https://seudominio.com.br
https://seudominio.com.br/*
https://www.seudominio.com.br
https://www.seudominio.com.br/*
```

Confirmar tambem templates de email e remetente antes do piloto.

## 9. Validacao smoke test em producao

Executar nesta ordem:

1. Abrir `/login`.
2. Criar conta owner real.
3. Concluir `/onboarding` com mesas, categorias e produtos.
4. Entrar no `/admin`.
5. Editar dados da loja.
6. Criar mesa e gerar QR.
7. Abrir `/r/<slug>/<mesa>` em aba anonima.
8. Enviar pedido.
9. Ver pedido no `/cozinha`.
10. Mudar status no KDS.
11. Fechar mesa no `/caixa`.
12. Criar assinatura no Asaas producao com CPF/CNPJ valido.
13. Confirmar `subscriptions`, `billing_customer_data`, `billing_payments` e `billing_events`.
14. Testar refresh em `/admin`, `/cozinha`, `/caixa` e QR publico.
15. Testar usuario sem permissao tentando acessar URL direta.

## 10. Monitoramento e logs

Minimo para piloto:

- Vercel logs para frontend/deploy.
- Supabase Edge Function logs para `asaas-billing` e `asaas-webhook`.
- Supabase Database logs para erros SQL/RLS.
- UptimeRobot monitorando:
  - `https://seudominio.com.br`
  - `https://seudominio.com.br/login`
  - `https://<project-ref>.supabase.co/functions/v1/asaas-webhook` com metodo permitido/teste controlado, se aplicavel.

Alertas:

- Email e WhatsApp/Telegram para downtime.
- Alerta manual diario nos primeiros 7 dias: revisar pagamentos, webhooks e erros 4xx/5xx.

## 11. Backups

Obrigatorio:

- Supabase Pro com backups diarios.
- Export semanal fora do Supabase durante piloto:

```sh
supabase db dump --db-url "$SUPABASE_DB_URL" -f backups/fluxmenu-$(date +%Y-%m-%d).sql
```

Guardar em local externo: Google Drive, S3, Backblaze ou bucket privado.

Recomendado para clientes pagantes:

- Ativar PITR no Supabase se pedidos/cobrancas virarem operacao critica.
- Testar restore em projeto separado mensalmente.

## 12. Estrategias anti-quebra

- Nunca aplicar SQL em producao sem backup recente.
- Usar Preview Deployment da Vercel antes de `--prod`.
- Manter Supabase sandbox separado da producao.
- Secrets de sandbox e producao nunca misturados.
- Feature flags/gating via `plans.features` e `plans.limits`, nao hardcode solto.
- Edge Functions idempotentes para webhook.
- Webhook com token forte e logs sem CPF/CNPJ completo.
- RLS sempre ligada em tabela nova.
- Toda query privada com `restaurant_id`.
- Rollback frontend: usar painel Vercel > Deployments > Promote/Rollback.
- Rollback SQL: restaurar backup ou aplicar migration reversa preparada.

## 13. Custos mensais estimados

Valores aproximados em maio de 2026, sujeitos a mudanca e consumo.

### Piloto pequeno

- Vercel Hobby/Pro: US$ 0 a US$ 20 por usuario/membro.
- Supabase Pro: US$ 25+ uso.
- Asaas: sem mensalidade principal; cobra taxas por recebimento/transacao.
- UptimeRobot: gratuito ou plano pago baixo.
- Dominio `.com.br`: cerca de R$ 40/ano.

Estimativa: US$ 25-45/mes + taxas Asaas + dominio.

### Primeiros clientes pagantes

- Vercel Pro: US$ 20/mes por seat.
- Supabase Pro: US$ 25/mes + storage/egress/compute extra se crescer.
- PITR Supabase opcional: cerca de US$ 100/mes por 7 dias de retencao.
- Monitoramento pago: cerca de US$ 7-30/mes.
- Asaas: variavel por cobranca recebida.

Estimativa sem PITR: US$ 52-75/mes + taxas Asaas. Com PITR: US$ 150+/mes.

## 14. Go-live rapido

```sh
npm ci
npm run lint
npm run build
supabase link --project-ref <project-ref>
supabase secrets set ASAAS_BASE_URL=https://api.asaas.com/v3 ASAAS_API_KEY=<key> ASAAS_WEBHOOK_TOKEN=<token> ASAAS_TRIAL_DAYS=14 ASAAS_BILLING_TYPE=UNDEFINED SUPABASE_URL=https://<project-ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service-role>
supabase functions deploy asaas-billing
supabase functions deploy asaas-webhook --no-verify-jwt
npx vercel --prod
```

Depois configurar dominio, Auth URLs e webhook Asaas antes de chamar cliente real.

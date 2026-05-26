# Asaas Sandbox no FluxMenu

## Edge Functions existentes

O projeto usa duas Supabase Edge Functions:

- `asaas-billing`: endpoint autenticado para criar assinatura, trocar plano, cancelar e consultar status/historico.
- `asaas-webhook`: endpoint publico para receber eventos do Asaas e atualizar `subscriptions`/`billing_payments`.

O segredo do Asaas nunca deve ser configurado como `VITE_*` nem usado no frontend. O frontend chama somente `asaas-billing` com o JWT do Supabase.

## Secrets obrigatorios

Configure no Supabase:

```bash
supabase secrets set ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3
supabase secrets set ASAAS_API_KEY=<sua_api_key_sandbox>
supabase secrets set ASAAS_WEBHOOK_TOKEN=<um_token_forte_gerado_por_voce>
supabase secrets set ASAAS_TRIAL_DAYS=14
supabase secrets set ASAAS_BILLING_TYPE=UNDEFINED
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` tambem precisam existir nas Edge Functions. Em projetos Supabase hospedados, normalmente ja ficam disponiveis; se necessario:

```bash
supabase secrets set SUPABASE_URL=https://<project-ref>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

## SQL necessario

Antes do deploy/use, rode no SQL Editor:

```sql
-- arquivo do repo
supabase/asaas-billing.sql
```

Ele adiciona campos de billing em `subscriptions`, cria `billing_payments`, `billing_events` e RLS de leitura.

## Deploy das functions

```bash
supabase functions deploy asaas-billing
supabase functions deploy asaas-webhook --no-verify-jwt
```

`asaas-webhook` precisa de `--no-verify-jwt` porque quem chama e o Asaas, nao um usuario autenticado do Supabase. A seguranca vem do header `asaas-access-token` comparado com `ASAAS_WEBHOOK_TOKEN`.

## URL final do webhook

Formato:

```text
https://<project-ref>.functions.supabase.co/asaas-webhook
```

Exemplo:

```text
https://abcdefghijklmnopqrst.functions.supabase.co/asaas-webhook
```

No painel do Asaas Sandbox, configure essa URL e informe o mesmo token salvo em `ASAAS_WEBHOOK_TOKEN`.

## Eventos para marcar no Asaas

Marque pelo menos:

- `PAYMENT_CREATED`
- `PAYMENT_RECEIVED`
- `PAYMENT_CONFIRMED`
- `PAYMENT_OVERDUE`
- `PAYMENT_DELETED`
- `PAYMENT_REFUNDED`
- `SUBSCRIPTION_CREATED`
- `SUBSCRIPTION_UPDATED`
- `SUBSCRIPTION_INACTIVATED`
- `SUBSCRIPTION_DELETED`

## Como testar assinatura sandbox

1. Rode `supabase/asaas-billing.sql` no banco.
2. Configure os Secrets acima.
3. Faça deploy das duas functions.
4. Entre no FluxMenu como `owner` ou `manager` de um restaurante.
5. Abra Admin > Assinatura.
6. Informe CPF ou CNPJ na tela de assinatura. O Asaas Sandbox exige esse dado para criar o customer/cobranca.
7. Clique em `Assinar` no plano desejado.
8. Confirme no painel Sandbox do Asaas que o cliente e assinatura foram criados.
9. Use o link de cobranca exibido na tela de assinatura para simular pagamento no sandbox.
10. Confirme se o webhook chegou em `billing_events` e se `subscriptions.status` mudou para `active` ou `past_due` conforme o evento.
11. Teste upgrade/downgrade clicando em outro plano; o frontend chama `asaas-billing`, mas o preco real vem da tabela `plans` no backend.
12. Teste cancelamento em Admin > Assinatura e confirme `subscriptions.status = canceled`.

## Validacoes de seguranca

- Nao existe `ASAAS_API_KEY` no frontend.
- CPF/CNPJ nao e logado; a tela recebe de volta apenas uma versao mascarada.
- O frontend nao envia preco, apenas `planId`.
- Apenas `owner` ou `manager` ativo do restaurante pode chamar alteracoes de assinatura.
- Webhook rejeita chamadas sem `asaas-access-token` correto.
- Eventos repetidos sao ignorados via `billing_events(provider, provider_event_id)`.
- Plano manual em localStorage nao concede recursos quando Supabase esta configurado.

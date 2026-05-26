# FluxMenu UX and performance audit

## Prioridade alta

1. Bundle inicial carregava telas pesadas juntas
- Impacto: login, onboarding e QR publico pagavam custo de admin/cozinha/caixa.
- Correcao: `React.lazy`/`Suspense` em `src/App.tsx` e chunks manuais em `vite.config.ts`.
- Resultado: telas principais separadas em chunks e bundle principal menor.

2. Re-render global a cada segundo
- Impacto: `tick` no AppContext atualizava toda a arvore, mesmo fora do KDS.
- Correcao: relogio local em `KitchenPanel`, passado para `KitchenOrderCard`.

3. Envio de pedido tinha atraso artificial
- Impacto: cliente esperava 1,2s mesmo quando o Supabase respondia antes.
- Correcao: `CartSidebar` agora aguarda apenas a operacao real.

## Prioridade media

4. Imagens do cardapio sem lazy loading
- Impacto: mobile baixava imagens fora da primeira dobra cedo demais.
- Correcao: `loading="lazy"` e `decoding="async"` nos cards.

5. PWA inexistente
- Impacto: sem install prompt, shell offline basico ou metadados mobile.
- Correcao: `manifest.webmanifest`, `sw.js`, icon SVG e registro do service worker em producao.

6. Viewport mobile dependia de `100vh`
- Impacto: barras do navegador mobile podiam cortar conteudo.
- Correcao: override `.h-screen { height: 100dvh; }`.

## Prioridade baixa

7. Acessibilidade parcial em carrinho e filtros
- Impacto: leitores de tela tinham pouca semantica para dialog e controles.
- Correcao: `role="dialog"`, `aria-modal`, `aria-label`, `aria-pressed` e foco visivel global.

8. Movimento excessivo para usuarios sensiveis
- Impacto: animacoes continuavam mesmo com preferencia de reducao de movimento.
- Correcao: `prefers-reduced-motion` no CSS.

## Pendencias recomendadas

- Rodar Lighthouse mobile em URL de producao depois do deploy.
- Adicionar screenshots Playwright para mobile/admin/QR quando houver suíte E2E.
- Considerar virtualizacao se pedidos/produtos passarem de centenas por tela.
- Avaliar self-host de fontes se o Lighthouse apontar impacto relevante.

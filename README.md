# Instagram Dashboard

Dashboard de metricas do Instagram com interface dark "Tech Elegance". Acompanhe seguidores, alcance, engajamento, melhor horario para postar e muito mais.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/kursku/instagram-dashboard&env=SUPABASE_URL,SUPABASE_ANON_KEY)

## Para quem

Profissionais de marketing digital e social media que precisam acompanhar metricas do Instagram. Nao requer conhecimento tecnico.

## Funcionalidades

- **27+ metricas** — seguidores, alcance, engajamento, stories, reels, audiencia
- **Graficos interativos** — engajamento semanal, mix de conteudo, evolucao historica
- **Heatmap de horarios** — descubra quando postar para ter mais engajamento
- **Comparativo automatico** — deltas (%) comparando com a coleta anterior
- **Filtro de periodo** — 7, 14, 30 dias ou intervalo personalizado (ate 93 dias)
- **Export PDF** — relatorio profissional com capa branded, pronto para cliente
- **Export HTML** — dashboard estatico para enviar por email
- **Multi-conta** — gerencie varias contas Instagram no mesmo dashboard
- **PWA** — instale como app no celular, funciona offline
- **Supabase** — dados na nuvem, acesse de qualquer dispositivo (opcional)

## Deploy rapido (1 clique)

1. Clique no botao **"Deploy with Vercel"** acima
2. Crie uma conta na Vercel (gratis) se ainda nao tiver
3. Configure as variaveis de ambiente quando solicitado
4. Pronto — seu dashboard esta online!

Para o guia completo passo a passo (recomendado para iniciantes), veja o **[GUIA-SETUP.md](GUIA-SETUP.md)**.

## Rodar localmente

```bash
node server.js
# Acesse http://localhost:4000
```

Nao precisa de `npm install` — zero dependencias externas.

## Variaveis de ambiente

| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `SUPABASE_URL` | Nao | URL do seu projeto Supabase |
| `SUPABASE_ANON_KEY` | Nao | Chave publica (anon) do Supabase |

Sem Supabase, o dashboard funciona normalmente com dados locais (localStorage/IndexedDB).

O token do Instagram e configurado pelo wizard do dashboard — nao precisa ser variavel de ambiente.

## Metricas

| Secao | Metricas |
|-------|----------|
| Crescimento | Seguidores total, novos seguidores, unfollows |
| Alcance | Contas alcancadas, impressoes |
| Engajamento | Curtidas, comentarios, salvamentos, compartilhamentos, interacoes total, taxa (%) |
| Acoes no Perfil | Toques link bio |
| Conteudo | Reels, carrosseis, posts estaticos, stories publicados |
| Performance Reels | Media de views, curtidas, saves, shares por reel |
| Performance Stories | Alcance medio, retencao, respostas |
| Audiencia | Genero (%), faixa etaria principal, top 3 cidades |
| Analise | Save rate, share rate, recomendacoes automaticas |
| Horarios | Heatmap dia x hora com melhor slot destacado |

## Arquitetura

```
instagram-dashboard/
├── index.html              <- Wizard de setup (4 passos)
├── dashboard.html          <- Dashboard principal
├── server.js               <- Proxy local + resolucao DNS
├── manifest.json           <- PWA manifest
├── sw.js                   <- Service worker (cache offline)
├── vercel.json             <- Config Vercel
├── supabase-schema.sql     <- SQL para criar tabelas no Supabase
├── GUIA-SETUP.md           <- Guia passo a passo para iniciantes
├── api/
│   ├── [...path].js        <- Serverless proxy (Vercel)
│   └── env-config.js       <- Endpoint de configuracao
├── css/
│   └── style.css           <- Design system "Tech Elegance"
└── js/
    ├── api.js              <- Wrappers da Graph API v25.0
    ├── storage.js          <- Multi-conta + sync Supabase
    ├── metrics.js          <- Agregacao de metricas + heatmap
    ├── ui.js               <- Charts, cards, evolucao, audience
    ├── wizard.js           <- Wizard de configuracao
    ├── dashboard-main.js   <- Orquestrador principal
    ├── history-store.js    <- IndexedDB + sync Supabase
    ├── pdf-report.js       <- Template A4 para export PDF
    └── supabase-client.js  <- Cliente Supabase (auto-init)
```

## Stack

- Vanilla JS (ES modules, sem framework)
- Chart.js para graficos
- IndexedDB + Supabase para historico
- Node.js server como proxy local
- Vercel serverless functions para deploy cloud

## Limitacoes

- **Token**: expira em 60 dias (o dashboard avisa quando esta perto)
- **Stories**: a API so retorna stories ativos (ultimas 24h)
- **Demographics**: requer minimo de 100 seguidores
- **Rate limits**: ~45 chamadas por atualizacao (limite da API: 200/hora)
- **Periodo maximo**: 93 dias por consulta (limite da API do Instagram)

## Licenca

MIT

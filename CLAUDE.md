<!-- STATUS
projeto: instagram-dashboard
fase: Deploy ativo — funcionalidades core completas, refinando para alunos
proximas_tarefas:
  - Testar integração Supabase end-to-end com projeto real
  - Incluir análise IA no export PDF
  - Documentar troubleshooting de "self-signed certificate" no GUIA-SETUP
ultima_decisao: Skills movidos para skills/ e documentados no GUIA-SETUP — agências agora sabem como gerar relatórios para clientes via Claude
ultima_sessao: 2026-04-29
prioridade: média
-->

# Instagram Dashboard

Dashboard de métricas do Instagram com interface dark "Tech Elegance".

## Stack

- Vanilla JS (ES modules, sem framework)
- Chart.js para gráficos
- IndexedDB para histórico de métricas
- Node.js server como proxy para Instagram Graph API
- Vercel serverless functions para deploy cloud

## Arquitetura

```
index.html          → Wizard de setup (token)
dashboard.html      → Dashboard principal
js/api.js           → Chamadas à Graph API via proxy
js/storage.js       → localStorage multi-conta + server config
js/metrics.js       → Fetch e processamento de métricas
js/ui.js            → Renderização de UI, charts, heatmap
js/dashboard-main.js → Orquestração principal
js/wizard.js        → Fluxo de configuração
js/history-store.js → IndexedDB para snapshots históricos
js/pdf-report.js  → Template A4 para export PDF
server.js           → Proxy local (elimina CORS, resolve DNS via IP direto)
api/                → Vercel serverless functions
sw.js               → Service worker (PWA)
```

## Endpoints da API

Usa `graph.instagram.com` com resolução DNS via IP direto (57.144.66.192) — tokens IGAA não funcionam com graph.facebook.com.

## Rodando localmente

```bash
node server.js
# http://localhost:4000
```

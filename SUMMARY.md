# Instagram Dashboard — Resumo de Sessões

## 2026-04-25
- Integrada versão da Amanda (zip) com multi-conta, Chart.js, design dark "Tech Elegance", export HTML
- Implementado histórico de métricas via IndexedDB com snapshots automáticos
- Adicionado date picker customizado (além dos presets 7d/14d/30d) com validação de 93 dias
- Gráficos de evolução histórica (4 line charts: seguidores, alcance, engajamento, interações)
- Comparativo automático com período anterior usando deltas (↑/↓ %) nos KPI cards
- Heatmap de melhor horário de postagem (dia × hora × engajamento médio)
- PWA: manifest.json + service worker com cache offline
- Export PDF com capa branded via window.print()
- Fix DNS: trocou graph.instagram.com → graph.facebook.com (resolvia para 0.0.0.0)
- Próximo passo: testar com token real e fazer deploy na Vercel

## 2026-04-25 (sessão 2)
- Testado com token real IGAA da conta @nickbargicorretor — wizard e dashboard funcionando
- DNS fix: voltou para graph.instagram.com com resolução direta via IP (57.144.66.192) — tokens IGAA não funcionam com graph.facebook.com
- Limpeza de contas stale: isConfigured() agora exige token válido, removeStaleAccounts() na inicialização
- Auto-redirect para wizard em erros de token OAuth
- Fallback de avatar: onerror substitui imagem quebrada pela inicial do username
- Template PDF dedicado (pdf-report.js): abre janela separada com layout A4, capa branded, tabela de performance, KPIs com deltas
- Service worker atualizado para v2 com pdf-report.js no cache
- Próximo passo: deploy na Vercel, testar token EAA para insights completos

## 2026-04-28
- Análise com IA via Claude Haiku 4.5 (api/analyze.js) — gera recomendações em PT-BR baseadas nas métricas reais
- Proxy de avatar (api/avatar.js) — resolve CORS/CDN blocking nas fotos de perfil do Instagram
- GUIA-SETUP atualizado com instrução de ANTHROPIC_API_KEY (opcional)
- Vercel env-config endpoint expondo SUPABASE_URL, SUPABASE_ANON_KEY, ANTHROPIC_API_KEY

## 2026-04-29
- Skills movidos de raiz para skills/ (dashboard-mensal.md, plano-acao-mensal.md)
- GUIA-SETUP: nova seção "Para agências e social media managers" documentando uso dos skills com Claude
- Troubleshooting: aluna com erro "self-signed certificate" — causa principal é antivírus com HTTPS scanning
- Próximo passo: testar Supabase e2e, incluir análise IA no PDF

---
name: dashboard-mensal
description: >
  Cria o dashboard HTML mensal de métricas do Instagram para entregar ao cliente.
  Ativa quando a pessoa enviar o HTML exportado do painel e pedir para criar o dashboard,
  relatório de métricas, dashboard do cliente, ou dashboard mensal.
  Se dois HTMLs forem enviados (mês atual + mês anterior), inclui automaticamente
  o comparativo com variação percentual mês a mês.
---

# Skill — Dashboard Mensal de Métricas do Instagram

Você é especialista em análise de métricas do Instagram e criação de relatórios visuais profissionais em HTML. Sua tarefa é transformar os dados do painel exportado em um dashboard completo e elegante para ser entregue ao cliente.

## Primeiro passo obrigatório — coletar a identidade visual

**Antes de gerar qualquer código**, perguntar obrigatoriamente:

---

> **Para criar o dashboard na identidade visual certa, preciso de algumas informações:**
>
> 1. **Cor primária** — qual é a cor principal da marca? (pode ser o hex, ex: `#E91E8C`, ou descrever: "roxo", "verde escuro")
> 2. **Cor secundária** — tem uma segunda cor de destaque? (opcional — se não tiver, vou derivar do primário)
> 3. **Nome da agência ou profissional** — como deve aparecer no footer? (ex: "Agência Furtacor" ou "@amandadiniz")
> 4. **Fonte** — usa alguma fonte específica? (se não souber, vou usar Inter — moderna e profissional)
> 5. **Logo** — tem um arquivo de logo para incluir no topo? (se sim, enviar a imagem junto ou informar a URL)
>
> Se preferir, pode responder tudo em uma linha só, por exemplo:
> *"cor #C8102E, sem secundária, nome Agência Furtacor, fonte padrão, sem logo"*

---

Só gerar o dashboard após receber essas respostas. Se o usuário pedir para gerar sem responder, usar os padrões definidos na seção de design abaixo e avisar quais padrões foram aplicados.

## Como identificar o que foi enviado

**Se receber 1 HTML:** é o mês atual — gerar o dashboard sem comparativo.

**Se receber 2 HTMLs:** identificar qual é o mais recente e qual é o anterior pelo nome do arquivo ou pelo período indicado dentro de cada um. Gerar o dashboard com comparativo completo mês a mês.

## O que o dashboard deve conter

### Cabeçalho
- Nome ou @ do perfil
- Período analisado (ex: Abril 2026 ou Abril vs. Março 2026)
- Nome da agência ou profissional (extrair do contexto ou deixar espaço)
- Data de geração do relatório

### KPIs Principais

Extrair e exibir com destaque visual:
- Total de seguidores
- Novos seguidores no período
- Contas alcançadas (alcance)
- Impressões
- Curtidas
- Comentários
- Salvamentos
- Compartilhamentos
- Taxa de engajamento (%)
- Views médias de reels
- Alcance médio de stories

**Se houver dois meses:** para cada KPI mostrar:
- Valor do mês anterior (menor, em cinza)
- Valor do mês atual (destaque)
- Variação em porcentagem com seta (↑ verde se cresceu, ↓ vermelho se caiu)
- Destacar em card especial as 3 maiores altas e as 2 maiores baixas do período

### Gráficos (usar Chart.js via CDN)
- Engajamento semanal: gráfico de barras com curtidas, saves e shares por semana
- Mix de conteúdo: gráfico de rosca com distribuição entre reels, carrosséis, posts e stories
- Se dois meses: gráfico de linha com evolução das métricas principais

### Top Posts
- Ranking visual dos 6 melhores posts por interações totais
- Para cada post: miniatura (se disponível), tipo (Reel / Carrossel / Post), curtidas, saves, shares

### Audiência
- Gênero: barras de progresso com % mulheres e % homens
- Faixa etária principal: destaque visual
- Top 3 cidades: barras de progresso com porcentagem

### Cruzamento de Dados
Bloco de análise textual com observações sobre:
- Qual formato gerou mais alcance vs. mais engajamento neste período
- Save rate e share rate calculados (saves ÷ alcance e shares ÷ alcance)
- O que os top posts têm em comum (formato, tipo de conteúdo)
- Se dois meses: o que mudou de um mês para o outro e o que a tendência indica

### Plano de Ação — Continuar / Melhorar / Parar

Três seções distintas, cada uma com 3 a 5 itens:

**Continuar fazendo**
O que os dados mostram que está funcionando e deve ser mantido ou ampliado.
Cada item começa com o dado: "Reels geraram X% mais alcance que posts — continuar priorizando o formato."

**Melhorar**
O que tem potencial mas ainda não está performando no ideal.
Cada item começa com o dado: "Save rate de X% está abaixo da média de 2% — testar conteúdos mais densos em informação."

**Parar de fazer**
O que os dados mostram que não está retornando resultado.
Cada item começa com o dado: "Posts estáticos representam X% do conteúdo mas geram apenas Y% das interações — reduzir."

### Footer
- Período de referência
- Data de geração
- Nome da agência ou profissional
- Nota: "Dados extraídos via API oficial do Instagram (Meta Graph API)"

## Padrões de design

```css
/* Adaptar com a identidade visual coletada no primeiro passo */
--bg: #0d0807;                          /* fundo escuro — manter */
--surface: rgba(255, 247, 236, 0.04);   /* cards glass — manter */
--border: rgba(255, 247, 236, 0.08);    /* bordas sutis — manter */
--text: #fff7ec;                         /* texto principal — manter */
--text-secondary: rgba(255, 247, 236, 0.58);
--positive: #4ade80;                     /* alta — manter */
--negative: #f87171;                     /* baixa — manter */
--primary: [cor coletada no briefing];  /* cor principal da marca */
--secondary: [cor secundária ou derivar do primário com opacidade];
```

**Fonte:** usar a fonte informada no briefing. Se não informada, usar Inter via Google Fonts.

**Logo:** se uma imagem de logo foi enviada, colocar no canto superior esquerdo do cabeçalho. Se foi enviada uma URL, usar diretamente. Se não houver logo, usar o nome da agência em texto com a cor primária.

**Regras fixas (não alterar com base na identidade visual):**
- Fundo escuro com cards em glass morphism (backdrop-filter: blur)
- Números animados com contador ao carregar (JavaScript)
- Responsivo (mobile-friendly)
- Gráficos com cores alinhadas ao tema escuro
- Setas de variação coloridas: verde para alta, vermelho para baixa

## Instruções de output

1. Gerar o arquivo HTML completo, funcional, pronto para abrir no navegador
2. Chart.js via CDN: `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js`
3. Fonte via Google Fonts (Inter ou a escolhida no briefing)
4. Tudo inline em um único arquivo — sem dependências externas além dos CDNs
5. Ao final do arquivo HTML, adicionar um comentário `<!-- dashboard-mensal v1 -->`

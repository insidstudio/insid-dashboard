const https = require('https');

function callClaude(systemPrompt, userMessage) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return reject(new Error('ANTHROPIC_API_KEY not configured'));

    const body = JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const text = parsed.content?.find(b => b.type === 'text')?.text || '';
          resolve(text);
        } catch (e) { reject(e); }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  for await (const chunk of req) body += chunk;

  let metrics;
  try { metrics = JSON.parse(body); }
  catch { res.statusCode = 400; res.end(JSON.stringify({ error: 'Invalid JSON' })); return; }

  const systemPrompt = `Voce e um consultor de marketing digital especialista em Instagram.
Analise as metricas fornecidas e gere um relatorio conciso em portugues brasileiro com:

1. RESUMO EXECUTIVO (2-3 frases sobre a saude geral do perfil)
2. PONTOS FORTES (2-3 itens com dados especificos)
3. PONTOS DE ATENCAO (2-3 itens com dados e benchmarks)
4. PLANO DE ACAO (3-5 acoes concretas priorizadas para o proximo mes)

Use os benchmarks:
- Taxa de engajamento boa: acima de 3%
- Save rate saudavel: acima de 2%
- Share rate bom: acima de 1%

Seja direto, use numeros, e de recomendacoes acionaveis. Nao use markdown com # ou **, use texto limpo.`;

  const m = metrics;
  const userMessage = `Perfil: @${m.username || 'desconhecido'}
Periodo: ${m.periodo || '30 dias'}
Seguidores: ${m.seguidores || 0}
Novos seguidores: ${m.novosSeguidores || 0}
Alcance: ${m.alcance || 0}
Impressoes: ${m.impressoes || 0}
Curtidas: ${m.curtidas || 0}
Comentarios: ${m.comentarios || 0}
Salvamentos: ${m.salvamentos || 0}
Compartilhamentos: ${m.compartilhamentos || 0}
Interacoes total: ${m.interacoesTotal || 0}
Taxa de engajamento: ${m.taxaEngajamento || 0}%
Toques link bio: ${m.toquesLinkBio || 0}
Reels publicados: ${m.reels || 0}
Carrosseis publicados: ${m.carrosseis || 0}
Posts estaticos: ${m.postsEstaticos || 0}
Stories: ${m.stories || 0}
Audiencia: ${m.pctMulheres || 0}% mulheres, ${m.pctHomens || 0}% homens
Faixa etaria principal: ${m.faixaEtaria || 'desconhecida'}
Top cidades: ${(m.cidades || []).map(c => c.nome + ' ' + c.pct + '%').join(', ') || 'sem dados'}
Melhor horario: ${m.melhorHorario || 'sem dados'}`;

  try {
    const analysis = await callClaude(systemPrompt, userMessage);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({ analysis }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message }));
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const d = req.body;
  const fmt = (n) => n != null ? Number(n).toLocaleString('pt-BR') : 'N/D';
  const cidades = (d.cidades || []).map(c => c.nome + ' ' + c.pct + '%').join(', ') || 'N/D';

  const prompt = `Voce e um estrategista de social media para marcas brasileiras. Analise e responda SOMENTE com JSON valido, sem markdown nem texto extra.

DADOS @${d.username} (${d.periodo}):
Seguidores: ${fmt(d.seguidores)} | Novos: ${fmt(d.novosSeguidores)} | Alcance: ${fmt(d.alcance)} | Impressoes: ${fmt(d.impressoes)}
Curtidas: ${fmt(d.curtidas)} | Comentarios: ${fmt(d.comentarios)} | Salvamentos: ${fmt(d.salvamentos)} | Shares: ${fmt(d.compartilhamentos)}
Engajamento: ${d.taxaEngajamento}% | Reels: ${d.reels} | Carrosseis: ${d.carrosseis} | Posts: ${d.postsEstaticos}
Publico: ${d.pctMulheres}% mulheres, ${d.pctHomens}% homens, faixa ${d.faixaEtaria || 'N/D'}
Cidades: ${cidades} | Melhor horario: ${d.melhorHorario || 'N/D'}

Formato de resposta (JSON exato, sem alteracao de chaves):
{
  "resumo": "3-4 frases executivas com os principais numeros e tendencias do periodo",
  "destaques": [
    {"titulo": "titulo curto", "valor": "numero ou %", "descricao": "1 frase explicando o que significa"}
  ],
  "cruzamento": {
    "destaque": "principal conquista do periodo com numero",
    "atencao": "principal ponto de atencao com dado especifico",
    "continuar": "o que esta funcionando e deve continuar",
    "melhorar": "o que pode ser otimizado",
    "parar": "o que esta consumindo recursos sem retorno"
  }
}
RESTRICOES OBRIGATORIAS - nunca ignore:
1. NAO mencione stories, reativar stories ou conteudo efemero (dados indisponiveis via API).
2. NAO sugira diversificar audiencia por localizacao ou expandir para outras cidades. O publico local e intencional.
3. Foque em engajamento, alcance, formato de conteudo e crescimento.

Limites: exatamente 3 destaques. Use dados reais dos numeros acima.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const result = await response.json();
    if (!response.ok) return res.status(500).json({ error: result.error?.message || 'API error' });

    const text = (result.content?.[0]?.text || '').trim();
    // Strip markdown code fences if present
    const clean = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

    try {
      const parsed = JSON.parse(clean);
      return res.status(200).json({ sections: parsed, analysis: parsed.resumo });
    } catch {
      return res.status(200).json({ analysis: text });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

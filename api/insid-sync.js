/**
 * Ponte entre o dashboard e o Sistema INSID.
 *
 * O navegador manda a coleta pra cá; daqui ela segue pro sistema com a chave.
 * A chave nunca desce pro browser — foi exatamente esse o erro do Supabase
 * antigo, que servia a chave anônima em /env-config e deixava a tabela de
 * tokens aberta pra qualquer um que abrisse o site.
 *
 * Configurar na Vercel (ou no .env local):
 *   INSID_API_URL  — ex.: https://sistema.insidstudio.com/api/metricas
 *   INSID_API_KEY  — a METRICAS_CHAVE do Sistema INSID
 */
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ erro: 'use POST' }));
  }

  const url = process.env.INSID_API_URL;
  const key = process.env.INSID_API_KEY;

  // Sem configuração o dashboard segue funcionando sozinho: o histórico
  // local continua valendo, só não sobe pro sistema.
  if (!url || !key) {
    res.statusCode = 501;
    return res.end(JSON.stringify({ erro: 'INSID_API_URL/INSID_API_KEY não configuradas' }));
  }

  let corpo = req.body;
  if (!corpo || typeof corpo === 'string') {
    try {
      corpo = JSON.parse(corpo || (await lerCorpo(req)));
    } catch {
      res.statusCode = 400;
      return res.end(JSON.stringify({ erro: 'corpo não é JSON' }));
    }
  }

  try {
    const resposta = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-insid-chave': key },
      body: JSON.stringify(corpo),
    });
    const texto = await resposta.text();
    res.statusCode = resposta.status;
    return res.end(texto);
  } catch (e) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ erro: 'sistema não respondeu', detalhe: String(e) }));
  }
};

function lerCorpo(req) {
  return new Promise((ok, falha) => {
    let dados = '';
    req.on('data', (p) => (dados += p));
    req.on('end', () => ok(dados));
    req.on('error', falha);
  });
}

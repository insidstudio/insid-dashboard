import { isConfigured, loadServerConfig, saveAccount, getAccounts, syncFromCloud } from './storage.js';
import { validateToken } from './api.js';
import { initSupabase } from './supabase-client.js';

const isAddMode = new URLSearchParams(location.search).get('add') === '1';

loadServerConfig().then(async () => {
  await initSupabase();
  await syncFromCloud();
  if (!isAddMode && isConfigured()) window.location.href = 'dashboard.html';
});

const STEPS = [
  {
    title: 'Criar App no Meta Developer',
    desc: 'Crie um aplicativo no portal de desenvolvedores do Meta.',
    instructions: `<ol>
      <li>Acesse <strong>developers.facebook.com</strong></li>
      <li>Faça login com sua conta do Facebook</li>
      <li>Clique em <strong>"Meus Apps"</strong> no menu superior</li>
      <li>Clique em <strong>"Criar App"</strong></li>
      <li>Selecione o tipo <strong>"Business"</strong></li>
      <li>Dê um nome ao app (ex: "Meu Dashboard")</li>
      <li>Selecione ou crie uma <strong>Conta Business</strong> e clique em Criar</li>
    </ol>`,
  },
  {
    title: 'Configurar Instagram Business Login',
    desc: 'Ative o acesso ao Instagram no seu app.',
    instructions: `<ol>
      <li>No painel do app, no menu esquerdo, vá em <strong>"Instagram"</strong> → <strong>"API setup with Instagram business login"</strong></li>
      <li>Aceite os termos de uso se solicitado</li>
      <li>Você verá a lista de contas Instagram conectadas</li>
    </ol>`,
  },
  {
    title: 'Gerar Token de Acesso',
    desc: 'Gere o token direto no painel do app.',
    instructions: `<ol>
      <li>Na página de <strong>"API setup with Instagram business login"</strong></li>
      <li>Encontre sua conta Instagram na lista</li>
      <li>Clique em <strong>"Generate token"</strong> ao lado da conta</li>
      <li>Faça login no Instagram quando solicitado</li>
      <li>Autorize as permissões:
        <ul>
          <li><code>instagram_business_basic</code></li>
          <li><code>instagram_business_manage_insights</code></li>
        </ul>
      </li>
      <li>Copie o token gerado (começa com <code>IGAA</code>)</li>
    </ol>
    <p style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">
      <strong>Nota:</strong> Este token é válido por 60 dias. O dashboard avisará quando estiver próximo de expirar.
    </p>`,
  },
  {
    title: 'Conectar ao Dashboard',
    desc: 'Cole seu token de acesso para conectar.',
    hasTokenInput: true,
  },
];

let currentStep = 0;
const isFileProtocol = window.location.protocol === 'file:';

function render() {
  const wizard = document.getElementById('wizard');

  const fileWarning = isFileProtocol ? `<div class="status visible warning" style="margin-bottom: 16px;">
    <strong>Aviso:</strong> Voce esta abrindo o arquivo diretamente (file://). O dashboard nao funciona assim.
    Abra o terminal na pasta do projeto e rode <code>node server.js</code>,
    depois acesse <code>http://localhost:4000</code>.
  </div>` : '';

  const progressItems = STEPS.map((_, i) => {
    let stateClass;
    if (i < currentStep) stateClass = 'completed';
    else if (i === currentStep) stateClass = 'active';
    else stateClass = 'pending';

    const circle = `<div class="wizard-step-indicator ${stateClass}">${i + 1}</div>`;
    const line = i < STEPS.length - 1 ? '<div class="wizard-step-line"></div>' : '';
    return circle + line;
  }).join('');

  const stepsHTML = STEPS.map((step, i) => {
    const isActive = i === currentStep;
    let bodyHTML;

    if (step.hasTokenInput) {
      bodyHTML = `
        <div class="input-group">
          <label class="input-label">Token de Acesso</label>
          <input type="text" class="input-field" id="tokenInput" placeholder="Cole seu token aqui (começa com IGAA...)">
          <span class="input-hint">O token começa com "IGAA" e tem aproximadamente 200 caracteres</span>
        </div>
        <div class="status" id="wizardStatus"></div>`;
    } else {
      bodyHTML = `<div class="wizard-instructions">${step.instructions}</div>`;
    }

    return `
      <div class="wizard-step${isActive ? ' active' : ''}">
        <div class="wizard-step-title">${step.title}</div>
        <div class="wizard-step-desc">${step.desc}</div>
        ${bodyHTML}
      </div>`;
  }).join('');

  const prevBtn = currentStep > 0
    ? '<button class="btn" id="btnPrev">Voltar</button>'
    : '';

  const actionBtn = currentStep < 3
    ? '<button class="btn btn-primary" id="btnNext">Próximo</button>'
    : '<button class="btn btn-primary btn-lg" id="btnConnect">Conectar</button>';

  wizard.innerHTML = `
    ${fileWarning}
    <div class="wizard-header">
      <div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:8px">Insid Studio</div>
      <h1 class="wizard-title">Dashboard de Clientes</h1>
      <p class="wizard-subtitle">${isAddMode ? 'Adicionar nova conta de cliente' : 'Conecte um perfil em 4 passos simples'}</p>
    </div>
    <div class="wizard-progress">
      ${progressItems}
    </div>
    ${stepsHTML}
    <div class="wizard-nav">
      ${prevBtn}
      ${actionBtn}
      ${isAddMode ? '<button class="btn" id="btnCancelAdd">Cancelar</button>' : ''}
    </div>`;

  document.getElementById('btnPrev')?.addEventListener('click', () => { currentStep--; render(); });
  document.getElementById('btnNext')?.addEventListener('click', () => { currentStep++; render(); });
  document.getElementById('btnConnect')?.addEventListener('click', handleConnect);
  document.getElementById('btnCancelAdd')?.addEventListener('click', () => { window.location.href = 'dashboard.html'; });
}

async function handleConnect() {
  const input = document.getElementById('tokenInput');
  const status = document.getElementById('wizardStatus');
  const btn = document.getElementById('btnConnect');
  const token = input.value.trim();

  if (!token.startsWith('EAA') && !token.startsWith('IGAA')) {
    status.className = 'status visible error';
    status.textContent = 'Token inválido. O token deve começar com "EAA" ou "IGAA". Verifique se copiou corretamente.';
    return;
  }

  btn.disabled = true;
  status.className = 'status visible warning';
  status.textContent = 'Verificando token...';

  try {
    const result = await validateToken(token);

    // Save as a named account
    const account = {
      id: Date.now().toString(),
      label: `@${result.username}`,
      token,
      userId: result.userId,
      username: result.username,
      profilePicture: result.profilePicture || null,
      tokenCreated: new Date().toISOString(),
    };
    await saveAccount(account);
    localStorage.setItem('ig_active_account', account.id);

    status.className = 'status visible success';
    status.textContent = `Conectado com sucesso! Conta: @${result.username}`;

    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
  } catch (err) {
    btn.disabled = false;
    status.className = 'status visible error';
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      status.textContent = 'Erro de conexao. Rode "node server.js" na pasta do projeto e acesse http://localhost:4000';
    } else {
      status.textContent = `Erro: ${err.message}`;
    }
  }
}

render();

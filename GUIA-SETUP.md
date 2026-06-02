# Guia de Setup — Instagram Dashboard

## O que vamos fazer?

Vamos colocar no ar o seu **dashboard pessoal de métricas do Instagram**. No final, você terá um link (tipo `seunome.vercel.app`) que pode acessar de qualquer lugar — celular, computador, tablet.

**Tempo estimado:** 15-20 minutos

**O que você precisa:**
- Uma conta Instagram Business ou Creator (não pode ser conta pessoal)
- Um computador com internet

---

## Passo 1 — Criar conta no GitHub

O GitHub é onde o código do dashboard fica guardado. Pense nele como um "Google Drive para código".

1. Acesse **github.com**
2. Clique em **"Sign up"**
3. Preencha email, senha e nome de usuário
4. Confirme seu email

---

## Passo 2 — Fazer o Fork do projeto

**O que é um Fork?** É como tirar uma "cópia" do projeto para a sua conta. A cópia é sua — você pode modificar sem afetar o original.

1. Acesse o repositório do dashboard: **github.com/kursku/instagram-dashboard**
2. No canto superior direito, clique no botão **"Fork"**
3. Na tela que aparecer, clique **"Create fork"**
4. Pronto! Agora você tem uma cópia do projeto na sua conta

---

## Passo 3 — Criar conta na Vercel (hospedagem gratuita)

A Vercel é onde o seu dashboard vai ficar online. É gratuito.

1. Acesse **vercel.com**
2. Clique em **"Sign Up"**
3. Escolha **"Continue with GitHub"** (assim conecta direto com o GitHub)
4. Autorize o acesso

---

## Passo 4 — Fazer o Deploy (colocar online)

1. No painel da Vercel, clique em **"Add New..." → "Project"**
2. Você verá a lista dos seus repositórios do GitHub
3. Encontre **"instagram-dashboard"** e clique em **"Import"**
4. **Não mexa em nada** na tela de configuração por enquanto
5. Clique em **"Deploy"**
6. Aguarde 1-2 minutos. Quando aparecer "Congratulations!", o dashboard está no ar!
7. Anote o link que aparece (ex: `instagram-dashboard-seunome.vercel.app`)

---

## Passo 5 — Criar o banco de dados no Supabase

O Supabase guarda o histórico das suas métricas na nuvem. Sem ele, os dados ficam só no seu navegador.

1. Acesse **supabase.com**
2. Clique em **"Start your project"**
3. Faça login com sua conta do GitHub
4. Clique em **"New project"**
5. Preencha:
   - **Name:** `instagram-dashboard` (ou qualquer nome)
   - **Database Password:** crie uma senha qualquer e **anote ela**
   - **Region:** escolha **South America (São Paulo)**
6. Clique em **"Create new project"**
7. Aguarde 1-2 minutos enquanto o projeto é criado

### Criar as tabelas

Agora precisamos criar as "tabelas" onde os dados serão guardados. É como criar uma planilha no Excel.

1. No menu lateral do Supabase, clique em **"SQL Editor"**
2. Clique em **"New query"**
3. **Apague** tudo que estiver escrito na área de texto
4. Copie **TODO** o texto abaixo e cole na área de texto:

```sql
create table if not exists accounts (
  id text primary key,
  label text,
  token text,
  user_id text,
  username text,
  profile_picture text,
  token_created timestamptz,
  created_at timestamptz default now()
);

create table if not exists snapshots (
  id serial primary key,
  account_id text not null,
  date date not null,
  days integer default 30,
  periodo jsonb,
  kpis jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_snapshots_account on snapshots (account_id, date);

alter table accounts enable row level security;
alter table snapshots enable row level security;

create policy "allow_all_accounts" on accounts for all using (true) with check (true);
create policy "allow_all_snapshots" on snapshots for all using (true) with check (true);
```

5. Clique no botao **"Run"** (ou aperte Ctrl+Enter)
6. Deve aparecer **"Success"**. Se der erro, verifique se copiou todo o texto

### Copiar as chaves do Supabase

1. No menu lateral, clique em **"Project Settings"** (icone de engrenagem)
2. Clique em **"API"** no submenu
3. Voce vai ver duas informacoes importantes:
   - **Project URL** — algo como `https://abcdefg.supabase.co`
   - **anon public key** — uma chave longa que comeca com `eyJ...`
4. **Copie e cole** essas duas informacoes em um bloco de notas. Vamos usar no proximo passo

---

## Passo 6 — Configurar as variáveis de ambiente

Variáveis de ambiente são como "senhas" que o dashboard precisa para funcionar. Elas ficam guardadas de forma segura na Vercel.

1. Volte para o painel da **Vercel** (vercel.com)
2. Clique no seu projeto **"instagram-dashboard"**
3. Clique na aba **"Settings"**
4. No menu lateral, clique em **"Environment Variables"**
5. Adicione as seguintes variáveis (uma por vez):

| Nome da variável | Onde encontrar o valor |
|---|---|
| `SUPABASE_URL` | A "Project URL" que você copiou do Supabase |
| `SUPABASE_ANON_KEY` | A "anon public key" que você copiou do Supabase |
| `ANTHROPIC_API_KEY` | Chave da API do Claude (opcional — habilita analise com IA) |

**Sobre a chave do Claude (opcional):**
A analise com IA e um recurso extra que gera recomendacoes personalizadas usando inteligencia artificial. Se voce nao tiver uma chave, o dashboard funciona normalmente — so nao tera o botao "IA". Para obter uma chave:
1. Acesse **console.anthropic.com**
2. Crie uma conta e va em **API Keys**
3. Clique em **"Create Key"** e copie a chave (comeca com `sk-ant-`)

Para cada variável:
- Digite o **nome** no campo "Key"
- Cole o **valor** no campo "Value"
- Clique em **"Save"**

6. Depois de adicionar as duas, clique na aba **"Deployments"**
7. No deploy mais recente, clique nos **3 pontinhos** (menu) e depois em **"Redeploy"**
8. Clique **"Redeploy"** para confirmar

---

## Passo 7 — Gerar o Token do Instagram

O token é como uma "chave" que permite o dashboard acessar as métricas da sua conta.

1. Acesse **developers.facebook.com**
2. Faça login com a conta do Facebook vinculada ao seu Instagram
3. Clique em **"Meus Apps"** no menu superior
4. Clique em **"Criar App"**
5. Selecione o tipo **"Business"**
6. Dê um nome (ex: "Meu Dashboard") e clique em **"Criar"**
7. No menu lateral, vá em **"Instagram"** → **"API setup with Instagram business login"**
8. Encontre sua conta Instagram na lista
9. Clique em **"Generate token"**
10. Faça login no Instagram e autorize as permissões
11. **Copie o token** que aparecer (é um texto longo que começa com `IGAA`)

**Importante:** Este token expira em 60 dias. O dashboard vai avisar quando estiver perto de expirar.

---

## Passo 8 — Conectar o Dashboard

1. Abra o link do seu dashboard (o link da Vercel do Passo 4)
2. Você verá o wizard de configuração
3. Avance pelos 3 primeiros passos clicando **"Próximo"**
4. No passo 4, **cole o token** que você copiou
5. Clique em **"Conectar"**
6. Se tudo deu certo, você verá: **"Conectado com sucesso!"**
7. O dashboard vai carregar suas métricas automaticamente

---

## Pronto!

Seu dashboard está no ar. Você pode:

- **Acessar de qualquer lugar** pelo link da Vercel
- **Ver métricas** de seguidores, alcance, engajamento
- **Filtrar por período** (7, 14, 30 dias ou personalizado)
- **Exportar PDF** com relatório profissional
- **Exportar HTML** para enviar por email
- **Gerar analise com IA** clicando no botao "IA" (requer ANTHROPIC_API_KEY)
- **Ver evolução** ao longo do tempo (aparece depois de 2+ coletas)
- **Ver o melhor horário** para postar
- **Instalar como app** no celular (PWA)

---

## Para agências e social media managers

Se você gerencia Instagram de clientes, o repositório inclui dois **skills para o Claude** que transformam os dados do dashboard em relatórios profissionais prontos para entregar.

### Como usar

1. No dashboard, clique em **"Exportar HTML"** para salvar o painel com os dados do período
2. Abra o **Claude** (claude.ai ou Claude Code)
3. Envie o arquivo HTML exportado junto com um dos comandos abaixo

### Skill 1 — Dashboard Mensal para o cliente

**Arquivo:** `skills/dashboard-mensal.md`

Cole o conteúdo desse arquivo no Claude como instrução, envie o HTML exportado e diga:
> *"Cria o dashboard mensal"*

O Claude vai pedir a identidade visual (cor, logo, nome da agência) e gerar um HTML completo e elegante para entregar ao cliente — com KPIs, gráficos, análise cruzada e comparativo mês a mês se você enviar dois meses.

### Skill 2 — Plano de Ação Mensal

**Arquivo:** `skills/plano-acao-mensal.md`

Cole o conteúdo desse arquivo no Claude como instrução e diga:
> *"Agora cria o plano de ação"*

O Claude gera o Plano de Ação do mês seguinte: o que Continuar / Começar / Parar, calendário semanal sugerido, 5 ideias de conteúdo baseadas nos top performers e metas mensuráveis — tudo baseado nos dados reais do período.

> **Dica:** Gere o dashboard mensal primeiro e o plano de ação na sequência na mesma conversa — o Claude aplica automaticamente a mesma identidade visual nos dois documentos.

---

## Problemas comuns

### "Token inválido"
- Verifique se copiou o token completo (é muito longo)
- O token deve começar com `IGAA` ou `EAA`
- Sua conta Instagram precisa ser Business ou Creator

### "Erro de conexão"
- Verifique se o deploy na Vercel deu certo (aba Deployments, deve estar verde)
- Tente fazer "Redeploy" na Vercel

### "Dados não aparecem"
- Algumas métricas precisam de tempo para aparecer (a API do Instagram tem um atraso de até 48h)
- Os gráficos de evolução aparecem depois de pelo menos 2 coletas em dias diferentes

### "Token expirou"
- Tokens duram 60 dias
- Volte ao Meta Developer e gere um novo token
- Cole o novo token no dashboard (vai pedir para reconectar)

---

## Glossário

| Termo | O que significa |
|---|---|
| **Fork** | Cópia de um projeto para a sua conta no GitHub |
| **Deploy** | Colocar o projeto online (no ar) |
| **Vercel** | Serviço gratuito que hospeda sites |
| **Supabase** | Banco de dados gratuito na nuvem |
| **Token** | Chave de acesso que permite ler as métricas do Instagram |
| **Variável de ambiente** | Configuração secreta guardada no servidor (não fica no código) |
| **API** | Canal de comunicação entre o dashboard e o Instagram |

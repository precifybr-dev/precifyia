

# Alteracao segura de e-mail com protecao anti-fraude

## Problema

Atualmente nao existe nenhum fluxo de alteracao de e-mail no sistema. Um usuario poderia, em teoria, alterar seu e-mail e depois criar uma conta nova com o e-mail antigo para ganhar um novo trial gratuito.

## Solucao

### 1. Tabela de historico de e-mails (migracao SQL)

Criar a tabela `email_change_history` para rastrear todos os e-mails ja usados por cada `user_id`:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | Identificador |
| user_id | uuid (FK auth.users) | Dono da conta |
| old_email | text | E-mail anterior |
| new_email | text | Novo e-mail |
| changed_at | timestamptz | Data da troca |

- RLS habilitado: usuario so le seus proprios registros
- Indice no campo `old_email` para buscas rapidas no cadastro

### 2. Configuracao de confirmacao dupla de e-mail

Ativar no `config.toml` a opcao `double_confirm_changes = true` na secao `[auth]`. Isso faz com que o sistema exija confirmacao tanto no e-mail antigo quanto no novo antes de efetivar a troca.

### 3. Edge Function: `change-email`

Nova Edge Function que:
- Recebe o novo e-mail do usuario autenticado
- Valida formato e tamanho do e-mail
- Chama `supabase.auth.admin.updateUserById()` com o novo e-mail (isso dispara os e-mails de confirmacao)
- Registra a troca na tabela `email_change_history`

### 4. Verificacao anti-fraude no cadastro (Register)

No `src/pages/Register.tsx`, antes de criar a conta, consultar `email_change_history` para verificar se o e-mail informado ja foi usado como `old_email`. Se sim:
- Bloquear o cadastro
- Exibir mensagem: "Este e-mail foi migrado para outro endereco. Use seu e-mail atualizado para fazer login."

Mesma verificacao sera adicionada na Edge Function de registro (server-side) para proteger contra bypass do frontend.

### 5. Interface de alteracao de e-mail no Dashboard

Adicionar um botao "Alterar e-mail" na area de informacoes do usuario no sidebar (onde aparece o e-mail atual). Ao clicar, abre um dialog pedindo:
- Novo e-mail
- Senha atual (para confirmacao de identidade)

Apos envio, exibe mensagem informando que ambos os e-mails (antigo e novo) receberao um link de confirmacao.

## Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar tabela `email_change_history` + indice + RLS |
| `supabase/functions/change-email/index.ts` | Nova Edge Function |
| `src/pages/Register.tsx` | Adicionar verificacao anti-fraude no cadastro |
| `src/pages/Dashboard.tsx` | Adicionar botao "Alterar e-mail" + dialog |
| `src/components/account/ChangeEmailDialog.tsx` | Novo componente de dialog |

## Fluxo do usuario

1. Usuario clica em "Alterar e-mail" no sidebar
2. Informa novo e-mail + senha atual
3. Sistema envia confirmacao para AMBOS os e-mails
4. Somente apos ambas as confirmacoes, o e-mail e atualizado
5. Registro salvo em `email_change_history`
6. Se alguem tentar criar conta com o e-mail antigo, o sistema bloqueia e informa

## Seguranca

- Confirmacao dupla (e-mail antigo + novo) via configuracao nativa
- Senha exigida para iniciar a troca
- Historico imutavel de trocas de e-mail (sem UPDATE/DELETE via RLS)
- Verificacao server-side no cadastro para prevenir bypass
- O `user_id` nunca muda, garantindo continuidade da cobranca e dados




# Plano: Sistema de Suporte para Usuarios + Integracao Admin

## Resumo

Criar uma pagina de Suporte acessivel pelo usuario logado, onde ele pode abrir tickets, acompanhar o historico e controlar o consentimento de acesso (chave liga/desliga) por ticket. No lado administrativo, os tickets aparecem com indicacao visual de consentimento, permitindo ao admin ativar o modo suporte apenas quando autorizado.

---

## O que ja existe

- Tabelas `support_tickets`, `ticket_messages`, `support_consent` com RLS configuradas
- Hook `useSupportDashboard` (lado admin) com gestao completa de tickets
- Componente `SupportConsentButton` (consentimento isolado, sem vinculo a ticket)
- Sistema de impersonacao (`useImpersonation`) funcional
- Painel admin de suporte (`SupportDashboard`) com listagem, filtros e detalhes

## O que falta

1. **Pagina de Suporte do usuario** -- nao existe nenhuma tela para o usuario abrir/ver tickets
2. **Consentimento vinculado ao ticket** -- o campo `ticket_id` existe em `support_consent` mas nao e usado no fluxo
3. **Coluna `consent_granted` no ticket** -- para o admin saber rapidamente se aquele ticket tem consentimento ativo
4. **Navegacao do usuario** -- nao existe item "Suporte" no menu lateral do Dashboard
5. **Indicacao visual no admin** -- mostrar no painel admin quais tickets tem consentimento ativo

---

## Plano de Implementacao

### Fase 1 -- Banco de dados

**Migration: Adicionar coluna `consent_granted` em `support_tickets`**

- Adicionar `consent_granted BOOLEAN DEFAULT false` na tabela `support_tickets`
- Essa coluna sera atualizada automaticamente via trigger quando um `support_consent` for inserido/atualizado para aquele `ticket_id`
- Criar trigger `sync_ticket_consent` que, ao inserir ou atualizar `support_consent`, atualiza `support_tickets.consent_granted` correspondente

### Fase 2 -- Pagina de Suporte do Usuario

**Novo arquivo: `src/pages/UserSupport.tsx`**

Pagina com:
- **Formulario de abertura de ticket**: assunto, mensagem, tipo (bug/duvida/pagamento)
- **Switch de consentimento**: dentro do formulario, um toggle (chave) com texto "Autorizar acesso de suporte a sua conta (somente leitura)" -- desabilitado por padrao
- **Lista de tickets do usuario**: mostrando assunto, status (aberto/em andamento/resolvido), data, e indicacao se consentimento esta ativo
- **Detalhe do ticket**: ao clicar, abre dialogo com historico de mensagens e campo para enviar nova mensagem
- **Controle de consentimento por ticket**: dentro do detalhe, toggle para habilitar/desabilitar consentimento a qualquer momento

### Fase 3 -- Hook do usuario

**Novo arquivo: `src/hooks/useUserSupport.ts`**

- `fetchMyTickets()` -- busca tickets do usuario logado
- `createTicket(subject, message, type, consentGranted)` -- cria ticket e, se consentido, insere em `support_consent`
- `sendMessage(ticketId, message)` -- envia mensagem no ticket
- `toggleConsent(ticketId, grant)` -- insere ou revoga consentimento para aquele ticket
- `fetchTicketMessages(ticketId)` -- carrega mensagens de um ticket

### Fase 4 -- Navegacao

**Arquivo: `src/pages/Dashboard.tsx`**

- Adicionar item "Suporte" com icone `Headphones` no array `navItems`
- Adicionar rota `support` no mapa de rotas

**Arquivo: `src/App.tsx`**

- Registrar rota `/app/support` apontando para `UserSupport`

### Fase 5 -- Indicacao no Admin

**Arquivo: `src/components/admin/SupportDashboard.tsx`**

- Na tabela de tickets, adicionar coluna "Consentimento" com icone verde (Shield + check) se `consent_granted = true`, ou cinza se false
- No detalhe do ticket, mostrar status do consentimento e, se ativo, habilitar botao "Acessar conta" (que ja existe)
- Se consentimento nao ativo, desabilitar o botao "Acessar conta" com tooltip "Usuario nao autorizou acesso"

**Arquivo: `src/hooks/useSupportDashboard.ts`**

- O `fetchTickets` ja busca `select("*")`, entao a nova coluna `consent_granted` vira automaticamente apos a migration

---

## Detalhes Tecnicos

### Trigger de sincronizacao (Migration)

```sql
-- Coluna
ALTER TABLE public.support_tickets 
  ADD COLUMN consent_granted BOOLEAN DEFAULT false;

-- Funcao de sync
CREATE OR REPLACE FUNCTION public.sync_ticket_consent()
RETURNS trigger AS $$
BEGIN
  IF NEW.ticket_id IS NOT NULL THEN
    UPDATE public.support_tickets 
    SET consent_granted = (NEW.is_active AND NEW.revoked_at IS NULL AND NEW.expires_at > now())
    WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Trigger
CREATE TRIGGER trg_sync_ticket_consent
AFTER INSERT OR UPDATE ON public.support_consent
FOR EACH ROW EXECUTE FUNCTION public.sync_ticket_consent();
```

### Fluxo do usuario

```text
Usuario abre pagina Suporte
  -> Ve lista de tickets anteriores
  -> Clica "Abrir novo ticket"
  -> Preenche assunto + mensagem + tipo
  -> Opcionalmente liga chave de consentimento
  -> Envia
  -> Ticket aparece na lista com status "Aberto"
  -> Admin ve o ticket no painel com indicacao de consentimento
```

### Arquivos criados
| Arquivo | Descricao |
|---------|-----------|
| `src/pages/UserSupport.tsx` | Pagina de suporte do usuario |
| `src/hooks/useUserSupport.ts` | Hook com logica de tickets do usuario |

### Arquivos modificados
| Arquivo | Mudanca |
|---------|---------|
| `src/App.tsx` | Nova rota `/app/support` |
| `src/pages/Dashboard.tsx` | Item "Suporte" no menu lateral |
| `src/components/admin/SupportDashboard.tsx` | Coluna de consentimento + bloqueio de acesso |

### Migration
| Mudanca | Descricao |
|---------|-----------|
| `support_tickets.consent_granted` | Coluna boolean para indicar consentimento ativo |
| `sync_ticket_consent()` | Funcao + trigger para manter sincronizado |


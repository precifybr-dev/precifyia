

# Mover Lixeira e Backup para a area do usuario

## Resumo

Remover "Backup" da navegacao principal e adicionar tanto "Backup" quanto "Lixeira" como opcoes na area inferior do sidebar, junto com "Modo Claro/Escuro" e "Sair", conforme o print de referencia. A Lixeira tera uma descricao visivel: "Itens excluidos sao mantidos por 30 dias".

## Mudancas

### Arquivo: `src/pages/Dashboard.tsx`

1. **Remover "Backup" do array `navItems`** (linha 184) -- ele nao deve aparecer na navegacao principal.

2. **Adicionar rotas `recycle-bin` e `backup` no `handleNavClick`** (linhas 111-129) para que os novos botoes funcionem.

3. **Adicionar dois botoes na secao inferior do sidebar** (entre o toggle de tema e o user info, linhas 329-363):
   - **Lixeira** (icone `Trash2`): navega para `/app/recycle-bin`, com subtexto "Itens mantidos por 30 dias"
   - **Backup** (icone `HardDrive`): navega para `/app/backup`

### Layout final da area inferior do sidebar

```text
------------------------------
  Modo Claro / Modo Escuro
  Lixeira (30 dias)
  Backup dos meus dados
------------------------------
  [Avatar] LANCHES PARANA
           email@gmail...
------------------------------
  Sair
------------------------------
```

### Detalhes tecnicos

- Importar `Trash2` do lucide-react
- Remover item `{ icon: HardDrive, label: "Backup", path: "backup" }` do array `navItems`
- Adicionar `"recycle-bin": "/app/recycle-bin"` no objeto `routes` dentro de `handleNavClick`
- Criar dois `Button variant="ghost"` na secao inferior, seguindo o mesmo padrao visual do botao "Modo Claro"
- O botao da Lixeira tera um texto secundario em `text-xs text-muted-foreground` informando "Itens mantidos por 30 dias"

### Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Dashboard.tsx` | Mover Backup e adicionar Lixeira na secao inferior do sidebar |


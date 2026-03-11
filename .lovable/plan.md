

## Plano: Adicionar Card de Renovação de Domínio no Admin

### O que será feito

Adicionar um card informativo de **Renovação de Domínio** dentro do `CloudCostsDashboard` (aba "Custos Cloud & IA" do painel admin), exibindo:

- Domínio: precify.com.br (Registro.br)
- Login: precify.br@gmail.com
- Nome da conta: Amanda
- Data de renovação: 11/03/2026
- Badge de status (ex: "Vence hoje", "X dias restantes", "Vencido")
- Ícone visual de alerta conforme proximidade do vencimento

### Implementação

**Arquivo**: `src/components/admin/CloudCostsDashboard.tsx`

1. Adicionar um novo card após os KPIs existentes com as informações do domínio
2. Calcular dias até a renovação usando `differenceInDays` do date-fns
3. Exibir badge colorido: verde (>30 dias), amarelo (<=30), vermelho (<=7 ou vencido)
4. Dados hardcoded no componente (sem tabela no banco, pois é informação estática administrativa)

### Estrutura visual

```text
┌─────────────────────────────────────────────┐
│ 🌐 Renovação de Domínio    [Badge: X dias] │
│                                             │
│ Domínio:     precify.com.br (Registro.br)   │
│ Login:       precify.br@gmail.com           │
│ Titular:     Amanda                         │
│ Renovação:   11/03/2026                     │
└─────────────────────────────────────────────┘
```

### Arquivo editado
- `src/components/admin/CloudCostsDashboard.tsx`


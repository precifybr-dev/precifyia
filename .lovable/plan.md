

## Plano: Adicionar política DELETE na tabela ifood_monthly_metrics

### Diagnóstico

A migração anterior deveria ter criado a política de DELETE mas só executou o `DROP CONSTRAINT`. A tabela `ifood_monthly_metrics` tem políticas para SELECT, INSERT e UPDATE, mas **não tem DELETE**.

O fluxo `handleApply` faz delete → insert. Como o RLS bloqueia silenciosamente o delete (0 linhas afetadas), o insert subsequente falha por violação de unique constraint, e os dados não são salvos.

### Correção

Uma migração SQL com:

```sql
CREATE POLICY "Users can delete own metrics"
  ON public.ifood_monthly_metrics
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

### Arquivo editado
- Migração SQL (1 statement)


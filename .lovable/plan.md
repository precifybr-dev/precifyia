

## Problemas encontrados no SQL gerado

### 1. Ordem das tabelas causa erro de FK
As tabelas são geradas em ordem **alfabética**, mas as FOREIGN KEYs são inline. Exemplo:
- `beverages` (letra B) referencia `stores` (letra S) → erro: `stores` ainda não existe
- `combo_generation_usage` referencia `combos` → `combos` vem depois
- `cost_allocations` referencia `fixed_expenses` → `fixed_expenses` vem depois
- ~20 tabelas referenciam `stores` que só aparece na letra S

**Solução**: Separar FKs do CREATE TABLE e emitir como `ALTER TABLE ... ADD CONSTRAINT` **após** todas as tabelas serem criadas.

### 2. FKs para `auth.users` não funcionam em banco novo
Muitas tabelas (access_logs, collaborators, profiles, etc.) referenciam `auth.users`. Em um banco Supabase novo, `auth.users` existe mas está vazio. Em um PostgreSQL puro, o schema `auth` não existe.

**Solução**: Emitir FKs para `auth.users` como comentário SQL (`-- FK: ... REFERENCES auth.users(...)`) com nota explicativa.

### 3. Tipos array sem prefixo `public.`
Linha 49 do output: `target_roles app_role[]` — deveria ser `public.app_role[]` para consistência com enums custom. O mesmo para `store_permission[]`.

**Solução**: Quando o tipo array é um enum custom (existe em `pg_type` com `typtype = 'e'`), adicionar prefixo `public.`.

### 4. FKs para tabelas do mesmo schema sem `public.`
No output, as FKs inline mostram `REFERENCES public.stores(id)` — OK. Mas no novo formato (ALTER TABLE), manter esse padrão.

### Plano de correção

**1 migration SQL** — `CREATE OR REPLACE FUNCTION public.generate_schema_ddl()` com:

1. **ENUMs** — sem mudança (já funciona)
2. **CREATE TABLE** — remover FKs inline, manter apenas colunas, PKs e UNIQUEs
3. **Nova seção "FOREIGN KEYS"** — após todas as tabelas:
   - FKs para `public.*` → `ALTER TABLE public.x ADD CONSTRAINT ... REFERENCES public.y(...)`
   - FKs para `auth.users` → emitidas como comentário com nota
4. **Array types** — verificar se é enum custom e adicionar `public.` prefix
5. **Resto** (indexes, RLS, policies, functions, triggers, views, realtime) — sem mudança

### Resultado esperado
O SQL gerado poderá ser copiado e executado sequencialmente em um banco Supabase novo sem erros de dependência.

### Arquivos
- 1 migration SQL (CREATE OR REPLACE da função)
- Nenhuma alteração no frontend


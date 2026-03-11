

## Plano: Atualizar `generate_schema_ddl` para exportação SQL completa

### Problema atual

A função `generate_schema_ddl()` exporta apenas:
- CREATE TABLE (colunas, tipos, defaults, NOT NULL)
- PRIMARY KEYs
- FOREIGN KEYs

**Faltam**: ENUMs, índices, CHECK constraints, RLS policies, triggers e functions — elementos críticos para uma migração completa ou auditoria.

### Solução

Recriar a função `generate_schema_ddl()` via migration para incluir **todas** as estruturas do schema `public`:

1. **ENUMs** — `CREATE TYPE ... AS ENUM (...)` extraídos de `pg_type` + `pg_enum`
2. **CREATE TABLE** — mantém o atual (colunas, PKs, FKs) + adiciona UNIQUE constraints
3. **Índices** — `CREATE INDEX` extraídos de `pg_indexes`
4. **RLS** — `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` de `pg_policies`
5. **Triggers** — `CREATE TRIGGER` de `information_schema.triggers`
6. **Functions** — `CREATE OR REPLACE FUNCTION` de `pg_proc` (apenas schema `public`)
7. **Views** — `CREATE VIEW` de `information_schema.views`

Cada seção terá separadores visuais (`-- ═══ ENUMS ═══`, `-- ═══ TABLES ═══`, etc.) para facilitar leitura.

### Arquivos

- **1 migration SQL** — `CREATE OR REPLACE FUNCTION public.generate_schema_ddl()` atualizada
- **Nenhuma alteração no frontend** — a página `AdminExport.tsx` já consome a RPC corretamente

### Impacto

- Zero downtime — é um `CREATE OR REPLACE`
- A exportação SQL no painel admin passará a conter o DDL completo do sistema
- Compatível com restauração em outro banco PostgreSQL


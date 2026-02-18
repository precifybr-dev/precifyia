
# Individualizar Configuracao de Negocio por Loja

## Problema

Ao trocar de loja (Loja 2, Loja 3), a pagina "Area do Negocio" continua exibindo o nome, tipo e CMV da primeira loja. Isso ocorre porque esses dados sao carregados da tabela `profiles` (que e global por usuario), e nao da tabela `stores` (que e individual por loja).

## Solucao

Usar os dados da loja ativa (`activeStore`) em vez dos dados do perfil, e adicionar o campo `default_cmv` a tabela `stores` para que cada loja tenha seu proprio CMV configuravel.

## Mudancas

### 1. Migracao de banco de dados

Adicionar coluna `default_cmv` na tabela `stores` (tipo numeric, nullable, default null). Migrar o valor existente do `profiles.default_cmv` para a loja padrao de cada usuario:

```sql
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS default_cmv numeric;

UPDATE public.stores s
SET default_cmv = p.default_cmv
FROM public.profiles p
WHERE s.user_id = p.user_id AND s.is_default = true AND p.default_cmv IS NOT NULL;
```

### 2. `src/pages/BusinessArea.tsx`

Atualmente o componente carrega `business_name`, `business_type` e `default_cmv` de `profile`. Mudar para:

- **Leitura**: Usar `activeStore.name` para nome, `activeStore.business_type` para tipo, e `activeStore.default_cmv` para CMV
- **Formulario de edicao**: Os campos editam diretamente a loja ativa via `supabase.from("stores").update(...)` em vez de atualizar `profiles`
- **Reatividade**: Quando `activeStore` muda, o formulario recarrega os dados da nova loja automaticamente
- **Save**: Atualizar a store via `updateStore()` do contexto (ou query direta) em vez de atualizar o perfil

O `formData` passara a ser inicializado assim:

```text
business_name = activeStore?.name
business_type = activeStore?.business_type
default_cmv   = activeStore?.default_cmv
```

E o save atualizara a tabela `stores` (nao `profiles`).

### 3. `src/contexts/StoreContext.tsx`

Adicionar `default_cmv` a interface `Store` para que o TypeScript reconheca o novo campo. Incluir `default_cmv` no Partial do `updateStore` para permitir atualizacao.

### 4. Nao necessario

- Nenhuma mudanca em edge functions
- Nenhuma mudanca em RLS (a tabela stores ja tem policies adequadas)
- O campo CNPJ nao existe na aplicacao atualmente, entao nao sera adicionado neste escopo

## Resultado

- Cada loja tera seu proprio nome, tipo de negocio e CMV independentes
- Ao trocar de loja, os dados exibidos e editados serao os da loja selecionada
- Dados existentes serao migrados automaticamente para a loja padrao

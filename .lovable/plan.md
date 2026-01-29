
<context>
O fluxo “Importar do iFood (IA)” está conseguindo ler o cardápio (chega na etapa de confirmação com “15 insumos encontrados”), mas falha ao salvar e mostra o toast vermelho “Erro ao salvar”.

Pelo backend, a tabela `ingredients` tem a restrição:
- `UNIQUE (user_id, code)` (nome: `ingredients_user_id_code_key`)

Isso significa que o “código” do insumo precisa ser único por usuário, independentemente da loja (store). Hoje a importação está calculando o `startCode` filtrando pela loja ativa (`store_id`). Se o usuário já tem códigos 1..N em outra loja, ao importar em uma nova loja o cálculo volta para 1 e a inserção quebra por duplicidade.
</context>

<goal>
1) Fazer a importação voltar a salvar sem erro, mesmo em ambiente multi-loja.
2) Garantir que, após importar, os itens apareçam imediatamente na loja ativa.
3) Melhorar a mensagem de erro (se acontecer de novo) para facilitar diagnóstico.
</goal>

<root-cause>
A lógica atual calcula o próximo código olhando apenas os ingredientes da loja ativa, mas o banco exige unicidade do código por usuário (não por loja). Resultado: colisão de códigos e falha de INSERT.
</root-cause>

<implementation-plan>
<step index="1" title="Ajustar cálculo do próximo código para ser global por usuário (não por loja)">
- No `src/pages/Ingredients.tsx` dentro de `handleIfoodImport`:
  - Remover o filtro por `store_id` da consulta do “maior code”.
  - Buscar o maior `code` do usuário em TODAS as lojas:
    - `.eq("user_id", user.id).order("code", {ascending:false}).limit(1)`
  - Definir `startCode = (maxCode || 0) + 1`.
- Manter `store_id` no INSERT para salvar os itens na loja ativa corretamente, mas com códigos únicos globalmente.
</step>

<step index="2" title="Adicionar retry automático se ocorrer colisão (mais robusto)">
- Ainda em `handleIfoodImport`:
  - Se o INSERT retornar erro de violação de unicidade (Postgres error code `23505`), fazer:
    1) Reconsultar o max code global do usuário.
    2) Regerar os `code` com um novo `startCode`.
    3) Tentar inserir novamente (apenas 1 retry para evitar loop).
- Isso resolve casos de concorrência (ex: duas importações quase ao mesmo tempo) e evita que o usuário fique travado.
</step>

<step index="3" title="Corrigir o refresh pós-importação para respeitar a loja ativa">
- No `src/pages/Ingredients.tsx`, onde o modal é usado:
  - Ajustar `onRefreshData` para chamar `fetchIngredients(user.id, activeStore?.id)` (hoje está chamando sem store e pode buscar `store_id = null`, escondendo os itens recém-importados).
</step>

<step index="4" title="Melhorar feedback de erro para o usuário (sem expor detalhes técnicos demais)">
- No `src/components/ifood-import/IfoodImportModal.tsx` no catch de `handleConfirmStore`:
  - Em vez de sempre mostrar “Não foi possível salvar…”, incluir uma mensagem curta e útil quando der erro:
    - Ex: “Não foi possível salvar. Ajustando códigos e tentando novamente…” (se estivermos fazendo retry e ainda falhar)
    - Se falhar definitivamente: “Não foi possível salvar os itens importados. Tente novamente em alguns segundos.”
  - Logar no console (para nós) `err.code`, `err.message`, `err.details` quando existirem.
</step>

<step index="5" title="Teste end-to-end (o mais importante)">
Cenários de validação:
1) Importar nessa loja do iFood na loja atual (a que você marcou no print) e confirmar:
   - Deve salvar sem toast vermelho.
   - Deve aparecer a lista com os novos insumos na loja ativa imediatamente.
2) Trocar a loja no seletor e repetir a importação:
   - Deve continuar salvando.
   - Os códigos devem continuar em sequência global (não reiniciar em 1 por loja).
3) Reimportar com a mesma loja e observar:
   - Mesmo que tenham itens parecidos, não deve quebrar por código (código sempre “anda pra frente”).
</step>
</implementation-plan>

<notes-for-you>
- Esse ajuste não muda o banco; apenas respeita a regra atual `UNIQUE(user_id, code)`.
- Se você preferir códigos “reiniciando por loja”, aí sim precisaria mudar a restrição do banco para algo como `UNIQUE(user_id, store_id, code)` (mudança de schema). Como a regra já está em produção no projeto, a correção mais segura é corrigir o cálculo no frontend.
</notes-for-you>

<files-to-change>
- `src/pages/Ingredients.tsx`
- `src/components/ifood-import/IfoodImportModal.tsx`
</files-to-change>

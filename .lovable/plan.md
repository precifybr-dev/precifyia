

## Plano: Confirmar atualização de CMV em todas as fichas técnicas

### Problema
Quando o usuário altera o "% CMV Desejado (Padrão)" na Área do Negócio, as fichas técnicas existentes mantêm o CMV antigo. O sistema deveria perguntar se o usuário quer propagar o novo CMV para todas as fichas.

### Alterações

**1. `src/pages/BusinessArea.tsx`**
- No `handleSave`, detectar se `default_cmv` mudou comparando `formData.default_cmv` com `activeStore.default_cmv`
- Se mudou, exibir um `AlertDialog` perguntando: *"Você alterou o CMV de X% para Y%. Deseja atualizar todas as fichas técnicas com o novo CMV?"*
- Botões: "Sim, atualizar todas" / "Não, manter como está"
- Se "Sim": executar `UPDATE recipes SET cmv_target = newCmv WHERE user_id = ... AND store_id = ...` via Supabase client
- Se "Não": salvar apenas as configurações do negócio sem alterar receitas
- Em ambos os casos, salvar as configurações normalmente

**2. Fluxo**
1. Usuário edita CMV e clica Salvar
2. Sistema detecta que CMV mudou
3. Abre diálogo de confirmação
4. Usuário escolhe → sistema executa a ação correspondente
5. Toast de sucesso com mensagem adequada ("X fichas atualizadas" ou "Configurações salvas sem alterar fichas")

### Detalhes técnicos
- Usa `AlertDialog` do shadcn/ui já existente no projeto
- O update nas recipes usa `cmv_target` (coluna existente na tabela `recipes`)
- Também atualiza `beverages.cmv_target` para a mesma loja
- Nenhuma migration necessária — apenas lógica no frontend


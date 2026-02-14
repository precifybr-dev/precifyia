

## Correção: Tela branca na Universidade

### Problema Identificado
- O módulo "IFOOD" está publicado, mas a única aula dentro dele está com status **"draft"**
- Quando o usuário acessa o módulo, nenhuma aula aparece (filtro `status = published`)
- O código **não tem estado vazio** para a lista de aulas, resultando em tela branca

### Correções

**1. Adicionar estado vazio na lista de aulas** (`src/pages/University.tsx`)
- Quando `lessons.length === 0` e `lessonsLoading === false`, exibir uma mensagem amigável como "Novas aulas estão sendo preparadas para este módulo" com ícone ilustrativo
- Seguir o mesmo padrão já usado na tela de módulos vazios (ícone + título + descrição)

**2. Adicionar estado vazio na visão de módulos** 
- Garantir que módulos sem aulas publicadas mostrem indicação visual (ex: "Em breve")

**3. Publicar a aula existente via migração**
- Atualizar o status da aula "Meu iFood caiu os pedidos" de `draft` para `published` no banco de dados para que os usuários possam visualizá-la

### Detalhes Técnicos

Arquivo modificado: `src/pages/University.tsx`
- Na seção de listagem de aulas (após o loading spinner), adicionar verificação:
```tsx
lessons.length === 0 ? (
  <Card>
    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
      <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="font-semibold text-lg mb-2">Em breve</h3>
      <p className="text-muted-foreground">Novas aulas estão sendo preparadas para este módulo.</p>
    </CardContent>
  </Card>
) : (
  // grid de aulas existente
)
```

Migração SQL:
```sql
UPDATE university_lessons 
SET status = 'published' 
WHERE id = 'c49a72cb-318a-4ea4-a74d-1065b16e7842';
```

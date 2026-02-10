
# Responsividade Mobile + Mensagem de Boas-vindas com Importacao

## Resumo

Tornar o site responsivo para dispositivos moveis em todas as telas principais (Landing, Login, Dashboard, Ingredients, Recipes, BusinessArea). Adicionar na tela inicial (Dashboard) uma mensagem de boas-vindas que sugere importar dados da planilha (para Insumos) e puxar do iFood (para Fichas Tecnicas), com mini-tutoriais visuais para guiar o usuario.

## Parte 1: Responsividade Mobile

### 1.1 Dashboard (`src/pages/Dashboard.tsx`)
- Header: tornar o badge "Trial: 7 dias" responsivo (esconder texto em telas pequenas, manter apenas icone)
- StoreSwitcher: esconder em mobile no header (ja acessivel no sidebar)
- Stats grid: usar `grid-cols-2` em mobile ao inves de coluna unica
- Welcome card: ajustar padding e tamanho de fonte em mobile
- Quick Actions: `grid-cols-1` em telas xs

### 1.2 Login (`src/pages/Login.tsx`)
- Ja esta razoavelmente responsivo (lado decorativo esconde em mobile com `hidden lg:flex`)
- Ajustar padding do formulario: `p-4 sm:p-8`

### 1.3 Landing Page
- Ja usa classes responsivas (`sm:`, `lg:`, `hidden sm:block` nos floating cards)
- Ajustes menores em padding e espacamento da HeroSection

### 1.4 Paginas internas (Ingredients, Recipes, BusinessArea, Beverages)
- Todas usam sidebar identico ao Dashboard -- o sidebar ja abre/fecha com hamburger menu
- Tabelas: adicionar `overflow-x-auto` para scroll horizontal em mobile
- Formularios: ajustar grids de `grid-cols-2` para `grid-cols-1` em mobile onde necessario

## Parte 2: Mensagem de Boas-vindas com Importacao

### 2.1 Novo componente: `src/components/dashboard/WelcomeImportPrompt.tsx`

Um componente que aparece na tela inicial (Dashboard) logo apos o card de boas-vindas. Sera exibido apenas quando o usuario ainda nao tem insumos OU nao tem fichas tecnicas cadastradas. Armazena no `localStorage` se o usuario ja dispensou a mensagem.

Conteudo do componente:
- **Card visual** com fundo suave e icones
- **Dois blocos lado a lado (empilhados em mobile)**:
  1. **Importar Insumos da Planilha**: icone de planilha, texto explicando que pode importar via CTRL+C/CTRL+V, botao "Importar Planilha" que abre o `SpreadsheetImportModal`, e um mini-tutorial (3 passos com icones numerados):
     - Passo 1: Abra sua planilha (Excel, Google Sheets)
     - Passo 2: Selecione os dados e copie (Ctrl+C)
     - Passo 3: Cole aqui e a IA mapeia automaticamente
  2. **Importar Fichas do iFood**: icone do iFood/link, texto explicando que pode puxar os produtos direto do iFood, botao "Importar do iFood" que navega para `/app/recipes` e abre o modal de importacao iFood, e mini-tutorial:
     - Passo 1: Acesse seu restaurante no iFood pelo navegador
     - Passo 2: Copie o link da pagina do seu restaurante
     - Passo 3: Cole aqui e importamos seus produtos

- **Botao "Nao mostrar novamente"** que persiste no localStorage

### 2.2 Integracao no Dashboard (`src/pages/Dashboard.tsx`)
- Importar o novo componente `WelcomeImportPrompt`
- Renderizar entre o card de boas-vindas e o OnboardingProgress
- Passar props: `userId`, `storeId`, `onOpenSpreadsheetImport`, `onNavigateToRecipes`
- Importar e adicionar o `SpreadsheetImportModal` no Dashboard (atualmente so existe na pagina de Insumos)

### 2.3 Props e estado
- Estado `showImportPrompt`: baseado no localStorage (`precify_import_prompt_dismissed`)
- Estado `importModalOpen`: para abrir o modal de importacao de planilha
- Estado `ingredientsCount` e `recipesCount`: buscar contagem no banco para decidir se exibe o prompt

## Parte 3: Detalhes tecnicos

### Arquivos a criar
| Arquivo | Descricao |
|---------|-----------|
| `src/components/dashboard/WelcomeImportPrompt.tsx` | Componente de boas-vindas com opcoes de importacao e mini-tutoriais |

### Arquivos a modificar
| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Dashboard.tsx` | Responsividade mobile + integracao do WelcomeImportPrompt + SpreadsheetImportModal |
| `src/pages/Login.tsx` | Ajustes de padding mobile |
| `src/pages/Ingredients.tsx` | Overflow-x em tabelas, grids responsivos |
| `src/pages/Recipes.tsx` | Overflow-x em tabelas, grids responsivos |
| `src/pages/BusinessArea.tsx` | Grids responsivos em formularios |

### Logica de exibicao do prompt
```text
SE localStorage("precify_import_prompt_dismissed") !== "true"
  E (ingredientsCount === 0 OU recipesCount === 0)
ENTAO mostrar WelcomeImportPrompt
```

### Mini-tutorial visual (dentro do componente)
Cada tutorial sera uma lista numerada com icones, usando classes Tailwind para layout compacto e responsivo. Estilo: passos em `flex gap-2` com numeros em circulos coloridos (`bg-primary/10 text-primary rounded-full w-6 h-6`).

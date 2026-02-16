

# Ajuste Final: Coordenadas de Itapema e Fallback por Estado

## Situacao Atual

A extracao direta (sem IA) ja esta **funcionando**. O teste com Burger King Itapema retornou **74 itens** com sucesso via Marketplace API, custo zero.

O unico risco restante: se a API do iFood for mais restritiva com coordenadas distantes, lojas de cidades menores podem falhar. Preciso blindar isso.

## O Que Precisa Mudar

### Arquivo: `supabase/functions/parse-ifood-menu/index.ts`

**1. Adicionar cidades ao mapa de coordenadas** (linha ~24-62):
- itapema-sc (-27.0906, -48.6155)
- balneario-camboriu-sc (-26.9909, -48.6353)
- blumenau-sc (-26.9194, -49.0661)
- chapeco-sc (-27.1007, -52.6157)
- criciuma-sc (-28.6775, -49.3697)
- itajai-sc (-26.9078, -48.6616)
- mais ~15 cidades frequentes de SC, PR, RS, MG, RJ, SP

**2. Adicionar fallback por estado** na funcao `getCityCoordinates` (linha ~64-73):

Logica nova:
1. Tentar match exato no mapa (ex: "itapema-sc")
2. Se nao encontrar, extrair o sufixo do estado (ex: "-sc")
3. Usar coordenadas da capital do estado como fallback
4. Ultimo recurso: Sao Paulo

Mapa de estados:
```
sc -> Florianopolis (-27.5954, -48.5480)
pr -> Curitiba (-25.4284, -49.2733)
rs -> Porto Alegre (-30.0346, -51.2177)
mg -> BH (-19.9167, -43.9345)
rj -> Rio (-22.9068, -43.1729)
... (todos os 26 estados + DF)
```

**3. Tentar API sem coordenadas como primeira tentativa** (linha ~81-122):

Adicionar um endpoint extra no array de URLs da funcao `fetchFromMarketplaceAPI`:
- Tentar primeiro SEM latitude/longitude
- Se falhar, tentar COM coordenadas (fluxo atual)

Isso cobre o caso onde a API aceita merchant ID sozinho.

## Resultado

- Qualquer cidade brasileira funciona (fallback por estado)
- Custo continua $0.00
- Sem IA em nenhum cenario do full_menu

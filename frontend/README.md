# EcoMapa — frontend

Aplicação React para explorar pontos de coleta seletiva em Cajazeiras, Paraíba, com mapa interativo baseado em Leaflet e OpenStreetMap.

## Tecnologias

- React e React DOM
- Vite
- Leaflet e React-Leaflet
- Fetch API

## Requisitos

- Node.js 20 ou superior
- API EcoMapa disponível localmente ou em um servidor acessível

## Configuração da API

Copie `.env.example` para `.env` e ajuste a URL base, se necessário:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

O frontend usa essa variável para todas as chamadas à API. Não coloque credenciais ou segredos nas variáveis `VITE_*`, pois elas são incluídas no bundle do navegador.

## Instalação e execução

Na pasta `frontend/`, instale as dependências:

```sh
npm install
```

Inicie o servidor de desenvolvimento:

```sh
npm run dev
```

## Build de produção

```sh
npm run build
```

Os arquivos de produção são gerados na pasta `dist/`. Para visualizar o build localmente:

```sh
npm run preview
```

O mapa consulta somente os pontos dentro dos limites geográficos visíveis e usa os tiles públicos do OpenStreetMap. A atribuição é exibida no próprio mapa; respeite a política de uso do serviço e não faça pré-carregamento ou cache próprio de tiles.

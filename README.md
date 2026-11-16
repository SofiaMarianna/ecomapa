# EcoMapa

Aplicação web para localizar e gerenciar pontos de coleta seletiva no município de Cajazeiras, Paraíba. O mapa permite explorar os pontos, consultar detalhes e materiais aceitos, além de apoiar a localização e o cadastro dos locais.

## Funcionalidades previstas

- Visualizar pontos de coleta em um mapa.
- Consultar detalhes dos pontos e os materiais aceitos.
- Cadastrar, consultar, editar e excluir pontos.
- Selecionar a localização de um ponto diretamente no mapa.
- Pesquisar endereços.
- Usar a geolocalização do navegador mediante permissão.
- Buscar pontos em um raio de 2 km.
- Consultar, para a visualização do mapa, somente os pontos dentro da área visível.

## Tecnologias definidas

- **Frontend:** React, Vite e JavaScript.
- **Mapa:** Leaflet, com dados cartográficos do OpenStreetMap.
- **Backend:** Node.js e Express.
- **Banco de dados:** PostgreSQL e PostGIS, hospedados no Supabase.
- **Acesso ao banco:** pacote `pg` com SQL diretamente, sem ORM.
- **Geocodificação:** Nominatim.
- **Ambiente local:** Docker.
- **Hospedagem:** frontend na Vercel e backend no Render.
- **Versionamento:** Git e GitHub.

## Estrutura do projeto

```text
ecomapa/
├── frontend/             # Aplicação React e interface do mapa
├── backend/              # API Node.js/Express e regras de negócio
├── database/
│   ├── migrations/       # Evolução versionada do esquema
│   └── seeds/            # Dados iniciais e registros fictícios
├── docs/
│   ├── architecture.md   # Componentes, integrações e API prevista
│   └── data-model.md     # Modelo aprovado do banco de dados
├── .gitignore
└── README.md
```

## Documentação

- [Frontend — instalação, configuração e execução](frontend/README.md)
- [Arquitetura](docs/architecture.md)
- [Modelo de dados](docs/data-model.md)

## Desenvolvimento local

### Pré-requisitos

- Node.js 20 ou superior e npm.
- Docker Desktop com Docker Compose.

O Compose usa a imagem `postgis/postgis:17-3.7` para o banco local.

### PostgreSQL com PostGIS

Na raiz do projeto, crie o arquivo de ambiente a partir do exemplo. Se já existir um `.env`, não o sobrescreva; confira os valores manualmente:

```powershell
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
} else {
    Write-Host "O arquivo .env já existe. Confira sua configuração manualmente."
}
```

Confirme que `POSTGRES_DB=ecomapa` e suba o banco:

```powershell
docker compose up -d db
docker compose ps
docker compose logs db
```

Em uma instalação nova, o PostgreSQL cria o banco `ecomapa` e executa automaticamente os scripts SQL montados no container, nesta ordem: schema e PostGIS, catálogo de materiais e pontos fictícios. Os arquivos são montados somente para leitura. Aguarde o serviço ficar saudável antes de iniciar a API.

**Importante sobre volumes existentes:** os scripts em `/docker-entrypoint-initdb.d` só são executados quando o diretório de dados do PostgreSQL está vazio. Alterar `POSTGRES_DB` não renomeia nem cria um banco em um volume já inicializado, e `docker compose up` não aplica automaticamente os scripts a esse volume. Não remova nem recrie o volume para tentar inicializar o banco.

Se o volume já existir e ainda não houver um banco `ecomapa`, preserve os bancos existentes. Faça backup e confira a lista de bancos primeiro; use a role e as credenciais que inicializaram originalmente o volume (os nomes abaixo são os do `.env.example` e podem não corresponder a um volume antigo):

```powershell
docker compose exec db psql -U ecomapa_admin -d postgres -c "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;"
docker compose exec db psql -U ecomapa_admin -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'ecomapa';"
```

Somente se a segunda consulta confirmar que `ecomapa` não existe, crie-o como um banco adicional e execute os scripts montados contra esse banco:

```powershell
docker compose exec db createdb -U ecomapa_admin -O ecomapa_admin ecomapa
docker compose exec -T db psql -U ecomapa_admin -d ecomapa -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/001_create_initial_schema.sql
docker compose exec -T db psql -U ecomapa_admin -d ecomapa -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/002_insert_materials.sql
docker compose exec -T db psql -U ecomapa_admin -d ecomapa -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/003_insert_demo_points.sql
```

Se `ecomapa` já existir, não execute esses comandos sem verificar seu conteúdo: a migration não é destinada a ser reaplicada sobre um schema existente. A configuração do Compose não altera as credenciais ou os bancos persistidos no volume.

### Backend

Copie o exemplo de configuração do backend, sem sobrescrever um arquivo `.env` existente:

```powershell
if (-not (Test-Path backend\.env)) {
    Copy-Item backend\.env.example backend\.env
} else {
    Write-Host "O arquivo backend\.env já existe. Confira sua configuração manualmente."
}
```

Confira `DB_NAME=ecomapa` e os demais valores de conexão. Instale as dependências e inicie a API:

```powershell
Set-Location backend
npm install
npm run dev
```

Para executar os testes, em outro terminal PowerShell na pasta `backend/`:

```powershell
npm test
```

A suíte usa `node:test`, fakes para as operações de banco e uma implementação simulada de `fetch`; não exige uma conexão real com PostgreSQL nem acesso ao serviço de geocodificação.

### Frontend

Em outro terminal, a partir da raiz do projeto, crie a configuração do frontend (sem sobrescrever um `.env` já existente):

```powershell
if (-not (Test-Path frontend\.env)) {
    Copy-Item frontend\.env.example frontend\.env
} else {
    Write-Host "O arquivo frontend\.env já existe. Confira sua configuração manualmente."
}
Set-Location frontend
npm install
npm run dev
```

O exemplo configura `VITE_API_BASE_URL=http://localhost:3000/api`. Para gerar o build de produção:

```powershell
npm run build
```

## Observação de segurança

Não haverá autenticação na primeira versão. A proteção das operações de escrita deve ser definida e implementada antes da publicação da API.

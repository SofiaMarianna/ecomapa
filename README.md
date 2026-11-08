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

- [Arquitetura](docs/architecture.md)
- [Modelo de dados](docs/data-model.md)

## Observação de segurança

Não haverá autenticação na primeira versão. A proteção das operações de escrita deve ser definida e implementada antes da publicação da API.

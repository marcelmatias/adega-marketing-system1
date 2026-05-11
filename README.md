# Adega Marketing System

Sistema completo de gestao para adegas com automacao de marketing, integracao Canva, YouTube e player para TV.

## Stack

- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **Autenticacao:** JWT + Session
- **Frontend:** EJS + Bootstrap 5 + Chart.js
- **Integracoes:** Canva API, YouTube API (com modo mock)

## Funcionalidades

- Multi-tenant por adega
- Gestao de produtos com estoque
- Vendas com controle de lucro
- Financeiro com fluxo de caixa
- Campanhas de marketing
- Integracao Canva (criar/exportar designs)
- Integracao YouTube (upload/playlists)
- Player TV automatico
- Dashboard com metricas e graficos

## Instalacao

```bash
# Instalar dependencias
npm install

# Configurar ambiente
cp .env.example .env
# Edite .env com suas configuracoes

# Popular banco com dados de exemplo
npm run seed

# Iniciar servidor
npm start
```

Acesse: http://localhost:3000

## Credenciais (apos seed)

| Email | Senha | Role |
|---|---|---|
| admin@adega.com | 123456 | admin |
| staff@adega.com | 123456 | staff |
| viewer@adega.com | 123456 | viewer |

## Estrutura

```
adega-marketing-system/
├── server.js              # Entrypoint
├── config/                # Configuracoes (db, jwt, canva, youtube)
├── models/                # Mongoose schemas
├── controllers/           # Logica de negocios
├── routes/                # Rotas REST
├── middlewares/           # Auth, tenant, error
├── services/              # Canva, YouTube, notificacao
├── views/                 # EJS templates
│   ├── partials/          # Header, navbar, footer
│   └── pages/             # Dashboard, produtos, vendas, etc
├── public/                # CSS, JS, uploads
├── seed/                  # Dados de exemplo
└── utils/                 # Helpers, logger
```

## API Endpoints

### Autenticacao
- `POST /api/auth/login` - Login (JSON)
- `POST /api/auth/login-view` - Login (form, view)
- `POST /api/auth/registrar` - Registrar usuario

### Produtos
- `GET /api/produtos` - Listar
- `GET /api/produtos/estoque-baixo` - Estoque critico
- `POST /api/produtos` - Criar
- `PUT /api/produtos/:id` - Atualizar
- `DELETE /api/produtos/:id` - Remover

### Vendas
- `GET /api/vendas` - Listar
- `GET /api/vendas/resumo` - Resumo financeiro
- `POST /api/vendas` - Criar (baixa estoque + registro financeiro)
- `POST /api/vendas/:id/cancelar` - Cancelar

### Financeiro
- `GET /api/financeiro` - Listar registros
- `GET /api/financeiro/fluxo-caixa` - Fluxo de caixa
- `GET /api/financeiro/relatorio-mensal` - Relatorio mensal
- `POST /api/financeiro` - Criar registro

### Campanhas
- `GET /api/campanhas` - Listar
- `POST /api/campanhas` - Criar
- `POST /api/campanhas/:id/design-canva` - Criar design Canva
- `POST /api/campanhas/:id/publicar-youtube` - Publicar YouTube

### Dashboard
- `GET /api/dashboard` - Metricas
- `GET /api/dashboard/vendas-por-dia` - Dados grafico
- `GET /api/dashboard/produtos-top` - Top produtos

### TV
- `GET /api/tv/playlist` - Playlist para TV
- `GET /api/tv/status` - Status da TV

### Canva (mock ou real)
- `POST /api/canva/criar-design` - Criar design
- `POST /api/canva/exportar/:id` - Exportar

### YouTube (mock ou real)
- `POST /api/youtube/upload` - Upload video
- `POST /api/youtube/playlist` - Criar playlist

## Modo Mock

Por padrao, Canva e YouTube operam em modo mock.
Para usar APIs reais, configure as chaves no `.env` e defina:
```
CANVA_MOCK=false
YOUTUBE_MOCK=false
```
# adega-marketing-system1
# adega-marketing-system1

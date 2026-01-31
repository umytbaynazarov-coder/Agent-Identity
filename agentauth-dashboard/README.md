# AgentAuth Dashboard

A production-ready React + TypeScript admin dashboard for managing and monitoring AgentAuth instances.

## Features

- **Agent Management**: View, filter, search, and manage all registered agents
- **Permission Editor**: Add/remove permissions with a user-friendly multiselect interface
- **Activity Feed**: Real-time verification activity across all agents with auto-polling
- **Webhooks**: Create, list, and manage webhook endpoints for event notifications
- **Analytics**: Visualize success rates, top agents, and tier distribution with interactive charts
- **Dark Mode**: Full dark mode support with system preference detection

## Technology Stack

- **Framework**: React 18 + TypeScript + Vite 5
- **Styling**: Tailwind CSS 3.4 with custom brand colors
- **State Management**:
  - Zustand (auth state with localStorage persistence)
  - TanStack Query (server state, caching, auto-refetch)
- **Charts**: Recharts 2.12
- **UI Components**: HeadlessUI + Heroicons
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router DOM 6
- **Deployment**: Docker + nginx

## Quick Start

### Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and set your API base URL:
   ```env
   VITE_API_BASE_URL=http://localhost:3000
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

   Dashboard will be available at [http://localhost:5173](http://localhost:5173)

### Production Build

```bash
npm run build
npm run preview
```

## Authentication

The dashboard uses the AgentAuth API itself for authentication (dogfooding approach).

### Login Requirements

- **Agent ID**: Your admin agent's unique identifier
- **API Key**: Your admin agent's secret key
- **Permissions**: Agent must have `*:*:*` (wildcard) permission for full admin access

### Creating an Admin Agent

Use the AgentAuth API to register an admin agent:

```bash
curl -X POST http://localhost:3000/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dashboard Admin",
    "owner_email": "admin@example.com",
    "permissions": ["*:*:*"],
    "tier": "enterprise"
  }'
```

Save the returned `agent_id` and `api_key` to log in to the dashboard.

## Project Structure

```
agentauth-dashboard/
├── src/
│   ├── api/                    # API client & endpoints
│   │   ├── client.ts          # HTTP client with auth & token refresh
│   │   ├── agents.ts          # Agent-related endpoints
│   │   └── webhooks.ts        # Webhook endpoints
│   ├── components/
│   │   ├── common/            # Reusable UI components
│   │   ├── charts/            # Chart components
│   │   └── layout/            # Layout components
│   ├── features/              # Feature modules
│   │   ├── auth/              # Authentication
│   │   ├── agents/            # Agent management
│   │   ├── activity/          # Activity feed
│   │   ├── webhooks/          # Webhook management
│   │   └── analytics/         # Analytics & charts
│   ├── lib/                   # Utilities
│   ├── types/                 # TypeScript types
│   ├── App.tsx                # Root component
│   └── main.tsx               # Entry point
├── public/                    # Static assets
├── Dockerfile                 # Docker build config
├── nginx.conf                 # nginx configuration
├── tailwind.config.js         # Tailwind CSS config
├── vite.config.ts             # Vite configuration
└── package.json
```

## Docker Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Docker Start

```bash
# From project root
docker-compose up -d --build

# Dashboard: http://localhost:8080
# API: http://localhost:3000
```

## Development

### Available Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | AgentAuth API base URL | `http://localhost:3000` |
| `VITE_APP_NAME` | Dashboard app name | `AgentAuth Dashboard` |
| `VITE_ACTIVITY_POLL_INTERVAL` | Activity feed polling interval (ms) | `10000` |
| `VITE_AGENTS_POLL_INTERVAL` | Agents page polling interval (ms) | `30000` |

## License

MIT License - see [LICENSE](../LICENSE) for details

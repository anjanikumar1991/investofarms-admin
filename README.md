# InvestoFarms — Admin Dashboard

React 18 + Vite + TypeScript admin panel for the InvestoFarms platform.

## Stack

- **React 18** + **TypeScript**
- **Vite** for bundling
- **react-router-dom v6** for routing
- Communicates with the FastAPI backend at `http://127.0.0.1:8000`

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev
```

Dashboard runs at `http://localhost:5173`

## Build

```bash
npm run build
# Output in dist/
```

## Pages

| Route | Purpose |
|---|---|
| `/login` | Admin login |
| `/dashboard` | Overview metrics |
| `/projects` | Farm project CRUD |
| `/users` | User management |
| `/investments` | Payment approval / rejection |

## API

Points to the FastAPI backend. Update `src/api/` base URL if deploying remotely.

## Notes

- Admin endpoints on the backend have **no auth guard** — restrict at network level for production
- Payment approval flow: admin reviews UPI reference → approves/rejects → status updates to `active` or `rejected`

# MultiTask AI

MultiTask AI is a full-stack workspace project with a React/Vite frontend and a Node.js backend split into gateway, authentication, chat, and agent services.

## Project structure

```text
backend/
  gateway/         API gateway and session-protected routes
  services/
    auth/          Google sign-in and user sessions
    chat/          Chat service
    agent/         Agent service
  shared/redis/    Shared Redis connection
frontend/          React application
```

## Requirements

- Node.js and npm
- MongoDB connection for the backend services
- Redis (the provided Docker Compose file starts Redis)
- Firebase project credentials for Google sign-in

## Configure environment

Create local `.env` files in the relevant service directories. Do not commit credentials or `.env` files.

The frontend uses:

```text
VITE_BACKEND_URL=
VITE_FIREBASE_API_KEY=
```

The gateway uses:

```text
FRONTEND_URL=
AUTH_Service_URL=
CHAT_Service_URL=
AGENT_Service_URL=
PORT=8000
```

The backend services use `MONGODB_URI` and `PORT` as needed. The authentication service also uses `SESSION_NODE_ENV`; the shared Redis connection uses `REDIS_URL`.

The authentication service expects a Firebase Admin service-account JSON file at:

```text
backend/services/auth/multitaskai-29234-firebase-adminsdk-fbsvc-5046364eb0.json
```

This credential file is intentionally ignored by Git. Obtain it from your Firebase project and place it locally at that path. Never commit or share the private key.

Give each backend service a unique port. The chat and agent services currently both default to port `8002`, so configure one of them to use a different port and set the gateway service URLs to match.

## Start Redis

From the `backend` directory:

```sh
docker compose up -d redis
```

## Install and run services

Install dependencies and start each service from its own directory:

```sh
cd backend/gateway
npm install
npm run dev
```

Repeat for `backend/services/auth`, `backend/services/chat`, and `backend/services/agent`, configuring each service's environment and port before starting it.

## Run the frontend

```sh
cd frontend
npm install
npm run dev
```

Other frontend scripts:

```sh
npm run build
npm run lint
npm run preview
```

## Notes

- The gateway exposes `/getuser` for the current session and proxies authentication routes under `/auth`.
- Chat and agent functionality is under development; connect an AI provider and finish the service routes before expecting generated assistant responses.
- Use only your own development credentials. Local secrets are excluded from version control.

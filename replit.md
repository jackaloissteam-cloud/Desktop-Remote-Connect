# RemoteLink

A browser-based remote desktop tool that lets a Windows PC share its screen to an iPhone over WebRTC — no software installs required.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/remote-desktop run dev` — run the frontend (port 18282)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + Tailwind CSS
- API: Express 5 + WebSocket (ws) signaling server
- Validation: Zod (`zod/v4`)
- API codegen: Orval (from OpenAPI spec)
- P2P: WebRTC (browser-native)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/remote-desktop/` — React frontend (Home, Host, Connect pages)
- `artifacts/api-server/` — Express API + WebSocket signaling
- `artifacts/api-server/src/lib/sessions.ts` — in-memory session store (6-digit codes)
- `artifacts/api-server/src/lib/signaling.ts` — WebRTC signaling via WebSocket at `/api/ws`
- `artifacts/remote-desktop/src/lib/ws.ts` — client-side WebSocket manager
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for REST endpoints)

## Architecture decisions

- Sessions are stored in memory (no database needed) — they expire after 1 hour via a cleanup interval
- WebRTC signaling runs over WebSocket at `/api/ws` (added to the API artifact's paths)
- Screen capture uses `getDisplayMedia()` — only works in Chrome/Edge on desktop
- Mouse/touch events are sent via WebRTC data channel (normalized 0–1 coordinates)
- The browser cannot move the system mouse cursor, so the PC side logs received events; a native companion app would be needed for full OS-level control

## Product

- `/` — Landing page: choose between "Share Screen (PC)" and "Connect to PC (iPhone)"
- `/host` — PC side: enter a name, share screen, get a 6-digit code for the iPhone
- `/connect` — iPhone side: enter the 6-digit code, view the remote screen, tap to send mouse events

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Screen sharing (`getDisplayMedia`) only works in Chrome or Edge on desktop — not in Safari or mobile browsers
- The `/api/ws` path must be listed in the API server's `artifact.toml` paths array for WebSocket proxying to work
- Sessions are in-memory only — restart clears all sessions

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

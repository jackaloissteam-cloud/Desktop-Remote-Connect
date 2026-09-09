import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { logger } from "./logger";
import { getSession, updateSession } from "./sessions";

interface SignalingClient {
  ws: WebSocket;
  code?: string;
  role?: "host" | "client";
}

type SignalingMessage =
  | { type: "register"; code: string; role: "host" | "client" }
  | { type: "offer"; code: string; data: unknown }
  | { type: "answer"; code: string; data: unknown }
  | { type: "ice-candidate"; code: string; data: unknown }
  | { type: "disconnect"; code: string };

const rooms = new Map<string, { host?: WebSocket; client?: WebSocket }>();

function getOrCreateRoom(code: string) {
  if (!rooms.has(code)) rooms.set(code, {});
  return rooms.get(code)!;
}

function getPeer(code: string, role: "host" | "client"): WebSocket | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;
  return role === "host" ? room.client : room.host;
}

function send(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

export function setupSignaling(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
    const client: SignalingClient = { ws };

    ws.on("message", (raw) => {
      let msg: SignalingMessage;
      try {
        msg = JSON.parse(raw.toString()) as SignalingMessage;
      } catch {
        logger.warn("Invalid WS message");
        return;
      }

      if (msg.type === "register") {
        const { code, role } = msg;
        const session = getSession(code);
        if (!session) {
          send(ws, { type: "error", message: "Session not found" });
          return;
        }

        client.code = code;
        client.role = role;
        const room = getOrCreateRoom(code);

        if (role === "host") {
          room.host = ws;
        } else {
          room.client = ws;
          if (room.host) {
            send(room.host, { type: "peer-joined" });
            updateSession(code, {
              status: "connected",
              connectedAt: new Date().toISOString(),
              peerCount: 2,
            });
          }
        }

        send(ws, { type: "registered", role, code });
        logger.info({ code, role }, "Peer registered");
        return;
      }

      if (
        msg.type === "offer" ||
        msg.type === "answer" ||
        msg.type === "ice-candidate"
      ) {
        const { code, data } = msg;
        if (!code || !client.role) return;
        const peer = getPeer(code, client.role);
        if (peer) {
          send(peer, { type: msg.type, data });
        }
        return;
      }

      if (msg.type === "disconnect") {
        handleDisconnect(client);
      }
    });

    ws.on("close", () => {
      handleDisconnect(client);
    });

    ws.on("error", (err) => {
      logger.error({ err }, "WebSocket error");
    });
  });

  function handleDisconnect(client: SignalingClient) {
    if (!client.code || !client.role) return;
    const room = rooms.get(client.code);
    if (!room) return;

    if (client.role === "host") {
      room.host = undefined;
      if (room.client) send(room.client, { type: "host-disconnected" });
    } else {
      room.client = undefined;
      if (room.host) send(room.host, { type: "client-disconnected" });
    }

    if (!room.host && !room.client) {
      rooms.delete(client.code);
      updateSession(client.code, { status: "disconnected", peerCount: 0 });
    } else {
      updateSession(client.code, { status: "waiting", peerCount: 1 });
    }

    logger.info({ code: client.code, role: client.role }, "Peer disconnected");
    client.code = undefined;
    client.role = undefined;
  }

  logger.info("WebSocket signaling server ready at /api/ws");
  return wss;
}

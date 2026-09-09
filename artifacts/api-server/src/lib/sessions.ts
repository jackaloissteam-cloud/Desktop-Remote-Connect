import { randomUUID } from "crypto";

export type SessionStatus = "waiting" | "connected" | "disconnected";

export interface Session {
  id: string;
  code: string;
  hostName: string;
  status: SessionStatus;
  createdAt: string;
  connectedAt: string | null;
  peerCount: number;
}

const sessions = new Map<string, Session>();

function generateCode(): string {
  let code: string;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (sessions.has(code));
  return code;
}

export function createSession(hostName: string): Session {
  const code = generateCode();
  const session: Session = {
    id: randomUUID(),
    code,
    hostName,
    status: "waiting",
    createdAt: new Date().toISOString(),
    connectedAt: null,
    peerCount: 0,
  };
  sessions.set(code, session);
  return session;
}

export function getSession(code: string): Session | undefined {
  return sessions.get(code);
}

export function deleteSession(code: string): boolean {
  return sessions.delete(code);
}

export function listActiveSessions(): Session[] {
  return Array.from(sessions.values()).filter(
    (s) => s.status !== "disconnected"
  );
}

export function updateSession(
  code: string,
  updates: Partial<Session>
): Session | undefined {
  const session = sessions.get(code);
  if (!session) return undefined;
  const updated = { ...session, ...updates };
  sessions.set(code, updated);
  return updated;
}

setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [code, session] of sessions.entries()) {
    if (new Date(session.createdAt).getTime() < cutoff) {
      sessions.delete(code);
    }
  }
}, 10 * 60 * 1000);

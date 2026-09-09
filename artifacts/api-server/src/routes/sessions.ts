import { Router, type IRouter } from "express";
import {
  createSession,
  getSession,
  deleteSession,
  listActiveSessions,
} from "../lib/sessions";

const router: IRouter = Router();

router.get("/sessions/active", (_req, res) => {
  const sessions = listActiveSessions();
  res.json(sessions);
});

router.post("/sessions", (req, res) => {
  const { hostName } = req.body as { hostName?: string };
  if (!hostName || typeof hostName !== "string" || !hostName.trim()) {
    res.status(400).json({ error: "hostName is required" });
    return;
  }
  const session = createSession(hostName.trim());
  res.status(201).json(session);
});

router.get("/sessions/:code", (req, res) => {
  const session = getSession(req.params.code);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session);
});

router.delete("/sessions/:code", (req, res) => {
  deleteSession(req.params.code);
  res.status(204).send();
});

export default router;

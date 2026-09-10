import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

const MAX_MESSAGE_LENGTH = 2_000;
const MAX_CONTEXT_LENGTH = 1_000;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1_000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const requestsByIp = new Map<string, { count: number; resetAt: number }>();

const SYSTEM_PROMPT = `You are the RemoteLink setup and troubleshooting assistant.

RemoteLink lets a Windows PC share its screen with an iPhone through a browser.
The PC uses Chrome or Edge, the iPhone uses Safari or another mobile browser,
and both devices normally need to be on the same network for local use.
The PC creates a six-digit session code, and the iPhone enters that code.
Screen sharing uses getDisplayMedia and WebRTC. Signaling uses the API server
and its /api/ws WebSocket endpoint. Sessions are stored in memory and expire
after one hour. The browser cannot move the real Windows mouse cursor; it can
only send normalized touch or pointer events to the PC page.

Give concise, practical instructions in the user's language. Ask one focused
follow-up question when important information is missing. Start with the
safest, simplest check. Do not ask for passwords, API keys, session codes, or
private personal information. Never claim that you can see the user's screen
or change their computer. If the issue is outside RemoteLink, say so clearly.`;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey ? new OpenAI({ apiKey }) : null;
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const current = requestsByIp.get(ip);

  if (!current || current.resetAt <= now) {
    requestsByIp.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  current.count += 1;
  return false;
}

router.post("/ai/troubleshoot", async (req, res) => {
  const message = req.body?.message;
  const context = req.body?.context;

  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.length > MAX_MESSAGE_LENGTH
  ) {
    res.status(400).json({
      error: `message is required and must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
    });
    return;
  }

  if (context !== undefined && (typeof context !== "string" || context.length > MAX_CONTEXT_LENGTH)) {
    res.status(400).json({
      error: `context must be ${MAX_CONTEXT_LENGTH} characters or fewer`,
    });
    return;
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    res.status(429).json({
      error: "Zu viele Anfragen. Bitte versuche es in einigen Minuten erneut.",
    });
    return;
  }

  const client = getClient();
  if (!client) {
    res.status(503).json({
      error: "Die KI-Hilfe ist noch nicht konfiguriert.",
    });
    return;
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5.6-terra",
      max_completion_tokens: 1_200,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(context?.trim()
          ? [{ role: "user" as const, content: `App-Kontext:\n${context.trim()}` }]
          : []),
        { role: "user", content: message.trim() },
      ],
    });

    const answer = response.choices[0]?.message?.content?.trim();
    if (!answer) {
      res.status(502).json({ error: "Die KI hat keine Antwort geliefert." });
      return;
    }

    res.json({ answer });
  } catch (error) {
    const providerError =
      error instanceof OpenAI.APIError
        ? { status: error.status, code: error.code }
        : {};
    req.log?.error(providerError, "AI troubleshooting request failed");
    res.status(502).json({
      error: "Die KI-Hilfe ist gerade nicht erreichbar. Bitte versuche es später erneut.",
    });
  }
});

export default router;
import { Router, type IRouter } from "express";

const router: IRouter = Router();

const MAX_MESSAGE_LENGTH = 2_000;
const MAX_CONTEXT_LENGTH = 1_000;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1_000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const requestsByIp = new Map<string, { count: number; resetAt: number }>();

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

function normalize(message: string) {
  return message
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function getLocalAnswer(message: string) {
  const text = normalize(message);

  if (/(chrome|edge|browser|browsern|freigabe|bildschirm teilen|desktop)/.test(text)) {
    return "Für den PC brauchst du Google Chrome oder Microsoft Edge. Öffne RemoteLink dort, wähle „Bildschirm freigeben“ und bestätige im Browser die Bildschirmfreigabe. Falls kein Fenster erscheint, lade die Seite neu und prüfe, ob du die Freigabe nicht zuvor blockiert hast.";
  }

  if (/(iphone|ios|safari|handy|telefon|mobil)/.test(text)) {
    return "Öffne RemoteLink auf dem iPhone in Safari oder einem aktuellen mobilen Browser. Wähle „Mit PC verbinden“ und gib den sechsstelligen Sitzungscode vom PC ein. Für die erste Verbindung sollten PC und iPhone im selben WLAN sein.";
  }

  if (/(code|sitzung|session|6-stellig|sechsstellig|verbinden)/.test(text)) {
    return "Der PC erzeugt den sechsstelligen Sitzungscode. Gib ihn auf dem iPhone exakt ein. Wenn der Code nicht funktioniert, starte die Sitzung auf dem PC neu, verwende den neuen Code und stelle sicher, dass beide Geräte im selben WLAN sind.";
  }

  if (/(wlan|netzwerk|network|internet|vpn|router|verbund|verbindung)/.test(text)) {
    return "Prüfe zuerst, ob PC und iPhone im selben WLAN sind. Deaktiviere testweise ein VPN, Gast-WLAN oder mobile Daten am iPhone. Unternehmens- und Gastnetzwerke können Geräte untereinander blockieren; teste dann ein normales privates WLAN.";
  }

  if (/(schwarz|kein bild|bildschirm|video|stream|webrtc|laedt|lädt|getrennt|abbruch)/.test(text)) {
    return "Lade RemoteLink auf beiden Geräten neu und starte die Sitzung am PC erneut. Bestätige die Bildschirmfreigabe im Browser, prüfe das WLAN und schalte ein VPN vorübergehend aus. Wenn die Verbindung danach abbricht, teste Chrome oder Edge am PC und Safari am iPhone.";
  }

  if (/(maus|klick|steuer|touch|tippen|cursor)/.test(text)) {
    return "RemoteLink überträgt den Bildschirm. Touch- und Zeigerereignisse können an die PC-Seite gesendet werden, aber der echte Windows-Mauszeiger lässt sich aus dem Browser nicht zuverlässig bewegen. Das ist eine Browser-Sicherheitsgrenze.";
  }

  if (/(firewall|zugriff|blockiert|port|node)/.test(text)) {
    return "Erlaube Node.js beziehungsweise den API-Server in der Windows-Firewall für private Netzwerke. Öffentliche Netzwerke solltest du nicht freigeben. Starte danach start-local.bat erneut und teste die angezeigte PC-Adresse.";
  }

  return "Ich kann kostenlos bei diesen Themen helfen: PC-Einrichtung mit Chrome oder Edge, iPhone-Verbindung, Sitzungscode, WLAN/VPN, Bildschirmfreigabe, WebRTC, Firewall und Maussteuerung. Beschreibe bitte kurz, was du siehst und an welchem Gerät das Problem auftritt.";
}

router.post("/ai/troubleshoot", (req, res) => {
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

  if (
    context !== undefined &&
    (typeof context !== "string" || context.length > MAX_CONTEXT_LENGTH)
  ) {
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

  res.json({ answer: getLocalAnswer(message.trim()) });
});

export default router;
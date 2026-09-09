# RemoteLink

Browser-basiertes Remote Desktop Tool — Windows PC Bildschirm direkt auf dem iPhone anzeigen und steuern, ohne Software-Installation.

---

## Wie es funktioniert

RemoteLink verbindet deinen PC und dein iPhone direkt über **WebRTC** (Peer-to-Peer). Der Server vermittelt nur den Verbindungsaufbau (Signaling) — der Bildschirmstream läuft danach direkt zwischen den Geräten, ohne Umweg über einen Server.

```
Windows PC (Chrome/Edge)          iPhone (Safari/Chrome)
        │                                  │
        │  1. Session erstellen            │
        │  → bekommt 6-stelligen Code      │
        │                                  │
        │  2. Code eingeben ──────────────►│
        │                                  │
        │◄────── WebRTC Verbindung ────────│
        │                                  │
        │  3. Bildschirm streamen ────────►│
        │◄────── Touch-Eingaben ───────────│
```

---

## Voraussetzungen

| Gerät      | Anforderung                                      |
|------------|--------------------------------------------------|
| Windows PC | Chrome oder Edge (Screen Sharing benötigt diese) |
| iPhone     | Safari, Chrome oder beliebiger Browser           |
| Netzwerk   | Beide Geräte im selben WLAN oder über Internet   |

> **Hinweis:** Screen Sharing (`getDisplayMedia`) funktioniert **nicht** in Firefox und **nicht** auf mobilen Browsern. Der PC muss immer Chrome oder Edge verwenden.

---

## Anleitung

### Schritt 1 — App auf dem PC öffnen

Öffne die App-URL in **Chrome oder Edge** auf deinem Windows PC.

Klicke auf **"Share Screen (PC)"**.

---

### Schritt 2 — Session starten

1. Gib einen Namen für deinen PC ein (z.B. "Work PC")
2. Klicke **"Share Screen"**
3. Chrome fragt dich, **welches Fenster oder welchen Bildschirm** du teilen möchtest — wähle den gewünschten aus
4. Du siehst jetzt eine **6-stellige Verbindungsnummer** und eine kleine Vorschau deines Bildschirms

---

### Schritt 3 — iPhone verbinden

Öffne dieselbe App-URL auf deinem iPhone.

Klicke auf **"Connect to PC (iPhone)"**.

Gib die **6-stellige Nummer** ein und tippe auf **"Connect"**.

---

### Schritt 4 — Remote Desktop verwenden

Der PC-Bildschirm erscheint jetzt live auf deinem iPhone.

- **Tippen** auf den Stream sendet einen Mausklick an die entsprechende Position
- **Wischen** sendet Mausbewegungen
- Der **Vollbild-Button** (oben rechts) öffnet die Ansicht im Vollbild
- **"Disconnect"** beendet die Verbindung

> **Hinweis zur Maussteuerung:** Der Browser kann aus Sicherheitsgründen den echten Windows-Mauszeiger nicht direkt bewegen. Die Touch-Koordinaten werden an den PC übertragen und geloggt. Für vollständige Maussteuerung wäre eine native Windows-Begleit-App notwendig (z.B. AutoHotkey).

---

### Session beenden

Auf dem PC: Klicke **"Stop Session"** oder schließe das Browser-Tab.

Die Session läuft automatisch ab, wenn beide Seiten getrennt sind.

---

## Technische Details

| Komponente | Technologie |
|------------|-------------|
| Frontend | React + Vite + Tailwind CSS |
| Routing | Wouter |
| Backend | Express 5 + WebSocket (ws) |
| Echtzeit | WebRTC (Peer-to-Peer) |
| Signaling | WebSocket unter `/api/ws` |
| Sessions | In-Memory (kein Datenbankbedarf) |
| Session-Code | 6-stellig, zufällig generiert |
| Session-Ablauf | Automatisch nach 1 Stunde |

### Sicherheit

- Alle WebRTC-Verbindungen sind Ende-zu-Ende verschlüsselt (DTLS/SRTP)
- Der Server sieht den Bildschirminhalt **nicht** — er leitet nur den Verbindungsaufbau weiter
- Kein Account, keine Registrierung, keine dauerhafte Datenspeicherung
- Sessions werden nur im Arbeitsspeicher gehalten und bei Neustart gelöscht

---

## Lokal ausführen

### Windows — Schnellstart

1. Installiere **Node.js in der LTS-Version** von [nodejs.org](https://nodejs.org).
2. Lade dieses Repository herunter oder klone es:

   ```bash
   git clone https://github.com/jackaloissteam-cloud/Desktop-Remote-Connect.git
   cd Desktop-Remote-Connect
   ```

3. Öffne den Ordner im Windows Explorer und doppelklicke auf **`start-local.bat`**.
   Das Skript installiert die Abhängigkeiten beim ersten Start, startet API und
   Frontend in eigenen Fenstern und öffnet die App automatisch im Browser.
4. Verwende die angezeigte **iPhone-Adresse** auf dem iPhone. Beide Geräte müssen
   im selben WLAN sein.
5. Wenn Windows nach einer Firewall-Freigabe fragt, erlaube den Zugriff für
   **private Netzwerke**.

Lass die beiden schwarzen Fenster geöffnet, solange RemoteLink verwendet wird.
Zum Beenden kannst du beide Fenster schließen.

### Manuell starten

```bash
# Abhängigkeiten installieren
pnpm install

# API-Server starten (Port 8080)
pnpm --filter @workspace/api-server run dev

# Frontend starten (Port 18282)
pnpm --filter @workspace/remote-desktop run dev
```

App ist dann erreichbar unter: `http://localhost:18282`

Beim lokalen Start leitet das Frontend die Anfragen unter `/api` und `/api/ws`
automatisch an den API-Server auf Port `8080` weiter.

---

## Projektstruktur

```
artifacts/
├── remote-desktop/          # React Frontend
│   └── src/
│       ├── pages/
│       │   ├── home.tsx     # Startseite (Rollenauswahl)
│       │   ├── host.tsx     # PC-Seite (Screen Sharing)
│       │   └── connect.tsx  # iPhone-Seite (Viewer)
│       └── lib/
│           └── ws.ts        # WebSocket-Manager
└── api-server/              # Express Backend
    └── src/
        ├── lib/
│       │   ├── sessions.ts  # Session-Verwaltung
│       │   └── signaling.ts # WebRTC Signaling
        └── routes/
            └── sessions.ts  # REST-Endpunkte

lib/
└── api-spec/
    └── openapi.yaml         # API-Spezifikation
```

---

## Bekannte Einschränkungen

- Screen Sharing funktioniert nur in Chrome/Edge auf dem Desktop
- Echter Mauszeiger kann nicht ohne native App bewegt werden
- Sessions gehen bei Server-Neustart verloren (kein persistenter Speicher)
- Für beste Performance: beide Geräte im selben WLAN

---

Made with WebRTC — no installs, no accounts, no servers in the middle.

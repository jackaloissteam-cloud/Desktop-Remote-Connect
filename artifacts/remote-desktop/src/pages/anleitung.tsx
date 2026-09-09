import { useLocation } from "wouter";
import {
  ArrowLeft, Monitor, Chrome, AlertTriangle, CheckCircle,
  ScreenShare, Hash, Smartphone, MousePointer, Wifi,
  BookOpen, ExternalLink
} from "lucide-react";

const SECTIONS = [
  {
    id: "voraussetzungen",
    title: "Voraussetzungen",
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          RemoteLink ist eine reine Web-App — du musst <strong className="text-foreground">keine Software installieren</strong>. Alles läuft direkt im Browser.
        </p>
        <div className="grid gap-3">
          {[
            {
              label: "PC (Host)",
              items: ["Google Chrome oder Microsoft Edge", "Windows 10 / 11", "Stabile Internetverbindung"],
              warn: "Firefox und Safari unterstützen keine Bildschirmfreigabe (getDisplayMedia).",
            },
            {
              label: "iPhone (Viewer)",
              items: ["Safari, Chrome oder beliebiger Browser", "iOS 14 oder neuer"],
              warn: null,
            },
          ].map((g) => (
            <div key={g.label} className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">{g.label}</div>
              <ul className="space-y-1">
                {g.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              {g.warn && (
                <div className="flex items-start gap-2 mt-3 text-xs text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {g.warn}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "pc-einrichten",
    title: "PC einrichten (Schritt für Schritt)",
    icon: Monitor,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    content: (
      <div className="space-y-3">
        {[
          {
            step: "01",
            icon: Chrome,
            title: "Chrome oder Edge öffnen",
            body: (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Öffne <strong className="text-foreground">Google Chrome</strong> oder <strong className="text-foreground">Microsoft Edge</strong> auf deinem Windows-PC.
                </p>
                <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex items-start gap-2 text-xs text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  Kein Firefox, kein Safari — diese Browser unterstützen keine Bildschirmfreigabe.
                </div>
              </>
            ),
          },
          {
            step: "02",
            icon: ExternalLink,
            title: "App-URL aufrufen",
            body: (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Gib folgende Adresse in die Adressleiste ein und drücke Enter:
                </p>
                <div className="mt-2 bg-card border border-border rounded-lg px-3 py-2 font-mono text-sm text-foreground select-all">
                  {typeof window !== "undefined" ? window.location.origin : "https://remotelink.replit.app"}
                </div>
              </>
            ),
          },
          {
            step: "03",
            icon: Monitor,
            title: 'Auf "Share Screen (PC)" klicken',
            body: (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Du siehst die Startseite mit zwei Optionen. Klicke auf die linke Karte <strong className="text-foreground">"Share Screen (PC)"</strong>.
              </p>
            ),
          },
          {
            step: "04",
            icon: Monitor,
            title: "PC-Name eingeben",
            body: (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Gib einen beliebigen Namen für deinen PC ein, z.B. <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">Büro-PC</span> oder <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">Gaming-Rechner</span>. Dann klicke auf <strong className="text-foreground">"Bildschirm freigeben"</strong>.
              </p>
            ),
          },
          {
            step: "05",
            icon: ScreenShare,
            title: "Bildschirm-Auswahl bestätigen",
            body: (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Chrome öffnet ein Fenster zur Auswahl, was geteilt werden soll:
                </p>
                <ul className="mt-2 space-y-1">
                  {[
                    ["Gesamter Bildschirm", "Teilt alles, was auf deinem Monitor angezeigt wird (empfohlen)"],
                    ["Fenster", "Teilt nur ein bestimmtes Programm-Fenster"],
                    ["Tab", "Teilt nur einen Browser-Tab"],
                  ].map(([title, desc]) => (
                    <li key={title} className="text-sm">
                      <span className="font-medium text-foreground">{title}</span>
                      <span className="text-muted-foreground"> — {desc}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground mt-2">Klicke auf deine Wahl und dann auf <strong>"Teilen"</strong>.</p>
              </>
            ),
          },
          {
            step: "06",
            icon: Hash,
            title: "6-stelligen Code notieren",
            body: (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nach dem Start erscheint ein großer <strong className="text-foreground">6-stelliger Code</strong> (z.B. <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">847 293</span>). Merke dir diesen oder kopiere ihn — du gibst ihn gleich auf dem iPhone ein. Der Code ist <strong className="text-foreground">1 Stunde</strong> gültig.
              </p>
            ),
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.step} className="flex gap-4 bg-card border border-border rounded-xl p-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-mono font-bold text-primary mt-0.5">
                {item.step}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground text-sm">{item.title}</span>
                </div>
                {item.body}
              </div>
            </div>
          );
        })}
      </div>
    ),
  },
  {
    id: "iphone",
    title: "iPhone verbinden",
    icon: Smartphone,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    content: (
      <div className="space-y-3">
        {[
          {
            step: "01",
            title: "App auf dem iPhone öffnen",
            body: "Öffne dieselbe URL wie auf dem PC in einem beliebigen Browser auf deinem iPhone (Safari empfohlen).",
          },
          {
            step: "02",
            title: '"Connect to PC (iPhone)" antippen',
            body: 'Tippe auf die rechte Karte "Connect to PC (iPhone)".',
          },
          {
            step: "03",
            title: "6-stelligen Code eingeben",
            body: "Gib den Code ein, den du auf dem PC siehst. Die Verbindung wird automatisch hergestellt.",
          },
          {
            step: "04",
            title: "Remote Desktop verwenden",
            body: "Du siehst jetzt den PC-Bildschirm live. Tippe auf den Stream, um Mausereignisse zu senden. Der Vollbild-Button maximiert die Ansicht.",
          },
        ].map((item) => (
          <div key={item.step} className="flex gap-4 bg-card border border-border rounded-xl p-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center text-xs font-mono font-bold text-violet-400 mt-0.5">
              {item.step}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground text-sm mb-1">{item.title}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "mausteuerung",
    title: "Maussteuerung",
    icon: MousePointer,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    content: (
      <div className="space-y-3">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-start gap-2 text-sm text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Eingeschränkte Maussteuerung</p>
              <p className="text-amber-400/80 leading-relaxed">
                Der Browser kann aus Sicherheitsgründen den echten Windows-Mauszeiger <strong className="text-amber-300">nicht direkt steuern</strong>. Touch-Eingaben vom iPhone werden zwar übertragen, aber der Zeiger bewegt sich nicht auf dem PC-Bildschirm.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-medium text-foreground mb-2">Was funktioniert:</p>
          <ul className="space-y-1.5">
            {[
              "Bildschirm live auf iPhone anzeigen",
              "Touch-Koordinaten werden an den PC übertragen",
              "Vollbild-Modus auf dem iPhone",
              "Verbindungsaufbau per Code",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed px-1">
          Für vollständige Maussteuerung wäre eine native Windows-App notwendig (z.B. ein AutoHotkey-Skript, das Koordinaten per UDP empfängt und den Cursor setzt).
        </p>
      </div>
    ),
  },
  {
    id: "probleme",
    title: "Häufige Probleme",
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    content: (
      <div className="space-y-3">
        {[
          {
            problem: "Bildschirmfreigabe-Button fehlt oder funktioniert nicht",
            solution: "Du verwendest Firefox oder Safari. Wechsle zu Google Chrome oder Microsoft Edge.",
          },
          {
            problem: "iPhone kann nicht verbinden (Code ungültig)",
            solution: "Sessions laufen nach 1 Stunde ab. Starte eine neue Session auf dem PC und verwende den neuen Code.",
          },
          {
            problem: "Verbindung trennt sich von selbst",
            solution: "Das passiert, wenn einer der Browser in den Hintergrund wechselt oder das Gerät in den Ruhezustand geht. PC-Tab aktiv lassen.",
          },
          {
            problem: "Bildschirm ist schwarz oder friert ein",
            solution: 'Klicke auf dem PC auf "Stop Session" und starte die Session erneut. Wähle diesmal "Gesamter Bildschirm" statt eines Fensters.',
          },
          {
            problem: "Sehr hohe Latenz / ruckeliges Bild",
            solution: "Stelle sicher, dass beide Geräte im selben WLAN sind. Eine direkte WLAN-Verbindung (LAN) ist deutlich schneller als eine Verbindung über das Internet.",
          },
        ].map((item) => (
          <div key={item.problem} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-sm font-medium text-foreground">{item.problem}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-5">{item.solution}</p>
          </div>
        ))}
      </div>
    ),
  },
];

export default function Anleitung() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur z-10">
        <button
          onClick={() => setLocation("/")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <BookOpen className="h-5 w-5 text-primary" />
        <span className="font-semibold text-foreground">Anleitung</span>
        <span className="text-xs text-muted-foreground ml-auto font-mono hidden sm:block">RemoteLink</span>
      </header>

      {/* Quick nav */}
      <div className="border-b border-border px-6 py-3 flex gap-4 overflow-x-auto scrollbar-hide">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="text-xs font-mono text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors shrink-0"
          >
            {s.title}
          </a>
        ))}
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 space-y-10">
        {/* Intro */}
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Installationsanleitung</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            RemoteLink ist eine Web-App — es gibt <strong className="text-foreground">nichts zu installieren</strong>. Du öffnest einfach die URL in einem Browser. Diese Anleitung zeigt dir, wie du alles einrichtest und verbindest.
          </p>
        </div>

        {/* Sections */}
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.id} id={section.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`${section.bg} border ${section.border} rounded-lg p-2`}>
                  <Icon className={`h-4 w-4 ${section.color}`} />
                </div>
                <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
              </div>
              {section.content}
            </section>
          );
        })}

        {/* Bottom CTA */}
        <div className="border-t border-border pt-8 pb-4 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Bereit? Starte direkt auf dem PC:</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => setLocation("/host")}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg px-5 py-2.5 transition-colors"
            >
              <ScreenShare className="h-4 w-4" />
              Bildschirm freigeben (PC)
            </button>
            <button
              onClick={() => setLocation("/connect")}
              className="flex items-center gap-2 bg-card hover:bg-card/80 border border-border text-foreground text-sm font-medium rounded-lg px-5 py-2.5 transition-colors"
            >
              <Smartphone className="h-4 w-4" />
              Mit iPhone verbinden
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-2">
            <Wifi className="h-3.5 w-3.5" />
            Ende-zu-Ende verschlüsselt via WebRTC · Kein Account erforderlich
          </div>
        </div>
      </main>
    </div>
  );
}

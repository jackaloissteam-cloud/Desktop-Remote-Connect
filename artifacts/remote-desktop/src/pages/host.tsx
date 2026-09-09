import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Monitor, Copy, CheckCircle, Circle, Loader2, X,
  StopCircle, ArrowLeft, AlertTriangle, ChevronRight,
  ScreenShare, Smartphone, Hash, MousePointer
} from "lucide-react";
import { useCreateSession, useDeleteSession, useGetSession, getGetSessionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { wsManager } from "@/lib/ws";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type HostState = "setup" | "form" | "waiting" | "connected" | "error";

function isSupportedBrowser() {
  const ua = navigator.userAgent;
  return /Chrome\//.test(ua) || /Edg\//.test(ua);
}

const STEPS = [
  {
    number: "01",
    icon: Monitor,
    title: "Chrome oder Edge verwenden",
    description:
      "Screen Sharing funktioniert nur in Google Chrome oder Microsoft Edge. Firefox und Safari werden nicht unterstützt.",
    warning: !isSupportedBrowser(),
    warningText: "Dein aktueller Browser wird nicht unterstützt. Bitte öffne diese Seite in Chrome oder Edge.",
    check: "Browser: Chrome / Edge",
  },
  {
    number: "02",
    icon: ScreenShare,
    title: "Bildschirm freigeben",
    description:
      'Klicke auf "Bildschirm freigeben". Der Browser öffnet ein Auswahlfenster — wähle einen Bildschirm, ein Fenster oder einen Tab aus, den du teilen möchtest.',
    note: 'Tipp: "Gesamter Bildschirm" gibt das komplette Desktop-Bild weiter.',
  },
  {
    number: "03",
    icon: Hash,
    title: "6-stelligen Code merken",
    description:
      "Nach dem Starten erscheint ein 6-stelliger Code. Diesen Code gibst du gleich auf dem iPhone ein. Der Code ist 1 Stunde gültig.",
  },
  {
    number: "04",
    icon: Smartphone,
    title: "iPhone verbinden",
    description: "Öffne dieselbe URL auf dem iPhone, wähle 'Connect to PC' und gib den Code ein. Die Verbindung wird automatisch hergestellt.",
    url: true,
  },
  {
    number: "05",
    icon: MousePointer,
    title: "Fertig — Remote Desktop aktiv",
    description:
      "Dein Bildschirm ist jetzt live auf dem iPhone sichtbar. Tippen auf den Stream sendet Mausbewegungen zurück an den PC.",
  },
];

export default function Host() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [hostName, setHostName] = useState("");
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [hostState, setHostState] = useState<HostState>("setup");
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeStep, setActiveStep] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();

  const { data: _session } = useGetSession(sessionCode ?? "", {
    query: {
      enabled: !!sessionCode && hostState === "waiting",
      queryKey: getGetSessionQueryKey(sessionCode ?? ""),
      refetchInterval: 2000,
    },
  });

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    wsManager.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      if (sessionCode) deleteSession.mutate({ code: sessionCode });
    };
  }, [sessionCode]);

  const handleSignalingMessage = useCallback(
    async (msg: Parameters<typeof wsManager["subscribe"]>[0] extends (msg: infer M) => void ? M : never) => {
      if (msg.type === "peer-joined") {
        setHostState("connected");
        if (queryClient && sessionCode) {
          queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionCode) });
        }
        if (pcRef.current) {
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          wsManager.send({ type: "offer", code: sessionCode!, data: offer });
        }
      } else if (msg.type === "answer" && pcRef.current) {
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(msg.data as RTCSessionDescriptionInit)
        );
      } else if (msg.type === "ice-candidate" && pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.data as RTCIceCandidateInit));
        } catch { /* ignore */ }
      }
    },
    [sessionCode, queryClient]
  );

  useEffect(() => {
    const unsub = wsManager.subscribe(handleSignalingMessage as Parameters<typeof wsManager["subscribe"]>[0]);
    return () => { unsub(); };
  }, [handleSignalingMessage]);

  const startSession = async () => {
    if (!hostName.trim()) return;
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
      } catch {
        setErrorMsg("Bildschirmfreigabe wurde abgelehnt oder wird in diesem Browser nicht unterstützt. Bitte Chrome oder Edge verwenden.");
        setHostState("error");
        return;
      }

      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const dc = pc.createDataChannel("control");
      dataChannelRef.current = dc;
      dc.onmessage = (e) => {
        try { JSON.parse(e.data as string); } catch { /* ignore */ }
      };

      stream.getVideoTracks()[0].onended = () => stopSession();

      createSession.mutate(
        { data: { hostName: hostName.trim() } },
        {
          onSuccess: (s) => {
            const code = s.code;
            setSessionCode(code);
            setHostState("waiting");
            wsManager.connect();
            setTimeout(() => wsManager.send({ type: "register", code, role: "host" }), 500);
            pc.onicecandidate = (e) => {
              if (e.candidate) wsManager.send({ type: "ice-candidate", code, data: e.candidate.toJSON() });
            };
          },
          onError: () => {
            setErrorMsg("Session konnte nicht erstellt werden. Bitte versuche es erneut.");
            setHostState("error");
            cleanup();
          },
        }
      );
    } catch {
      setErrorMsg("Unerwarteter Fehler. Bitte versuche es erneut.");
      setHostState("error");
    }
  };

  const stopSession = () => {
    if (sessionCode) deleteSession.mutate({ code: sessionCode });
    cleanup();
    setSessionCode(null);
    setHostState("form");
    setHostName("");
  };

  const copyCode = () => {
    if (!sessionCode) return;
    navigator.clipboard.writeText(sessionCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.origin + "/connect");
  };

  const browserOk = isSupportedBrowser();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <button
          data-testid="button-back"
          onClick={() => { stopSession(); setLocation("/"); }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Monitor className="h-5 w-5 text-primary" />
        <span className="font-semibold text-foreground">
          {hostState === "setup" ? "PC einrichten" : "Host Session"}
        </span>
        {hostState === "connected" && (
          <span className="ml-auto flex items-center gap-1.5 text-xs font-mono text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            iPhone verbunden
          </span>
        )}
        {hostState === "waiting" && (
          <span className="ml-auto flex items-center gap-1.5 text-xs font-mono text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            Warte auf iPhone
          </span>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-6 py-10">

        {/* ── SETUP WIZARD ── */}
        {hostState === "setup" && (
          <div className="w-full max-w-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-1">Schritt-für-Schritt Einrichtung</h2>
              <p className="text-muted-foreground text-sm">Folge diesen Schritten, um deinen PC als Remote-Host einzurichten.</p>
            </div>

            {/* Browser warning banner */}
            {!browserOk && (
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-300">Browser nicht unterstützt</p>
                  <p className="text-xs text-amber-400/80 mt-0.5">
                    Bitte öffne diese Seite in <strong>Google Chrome</strong> oder <strong>Microsoft Edge</strong>. Screen Sharing funktioniert nicht in deinem aktuellen Browser.
                  </p>
                </div>
              </div>
            )}

            {/* Steps */}
            <div className="space-y-3 mb-8">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                const isActive = i === activeStep;
                const isDone = i < activeStep;
                return (
                  <button
                    key={step.number}
                    data-testid={`step-${step.number}`}
                    onClick={() => setActiveStep(i)}
                    className={`w-full text-left rounded-xl border transition-all duration-200 ${
                      isActive
                        ? "border-primary/50 bg-primary/5"
                        : isDone
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-border bg-card hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-start gap-4 p-4">
                      {/* Step indicator */}
                      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold mt-0.5 ${
                        isDone
                          ? "bg-emerald-500/20 text-emerald-400"
                          : isActive
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {isDone ? <CheckCircle className="h-4 w-4" /> : step.number}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`h-4 w-4 ${isActive ? "text-primary" : isDone ? "text-emerald-400" : "text-muted-foreground"}`} />
                          <span className={`font-medium text-sm ${isActive ? "text-foreground" : isDone ? "text-emerald-300" : "text-muted-foreground"}`}>
                            {step.title}
                          </span>
                        </div>

                        {isActive && (
                          <div className="mt-2 space-y-2">
                            <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                            {step.note && (
                              <p className="text-xs text-primary/70 bg-primary/5 rounded px-2 py-1">{step.note}</p>
                            )}
                            {step.warning && (
                              <div className="flex items-center gap-2 text-xs text-amber-400">
                                <AlertTriangle className="h-3 w-3" />
                                {step.warningText}
                              </div>
                            )}
                            {step.url && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-foreground">
                                  {typeof window !== "undefined" ? window.location.origin : ""}/connect
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyUrl(); }}
                                  className="text-xs text-primary hover:underline"
                                >
                                  Kopieren
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <ChevronRight className={`h-4 w-4 shrink-0 mt-0.5 transition-transform ${isActive ? "rotate-90 text-primary" : "text-muted-foreground"}`} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => activeStep > 0 && setActiveStep(activeStep - 1)}
                disabled={activeStep === 0}
                className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                Zurück
              </button>

              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i === activeStep ? "w-4 bg-primary" : i < activeStep ? "w-1.5 bg-emerald-500" : "w-1.5 bg-muted"}`} />
                ))}
              </div>

              {activeStep < STEPS.length - 1 ? (
                <button
                  onClick={() => setActiveStep(activeStep + 1)}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Weiter <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  data-testid="button-start-wizard"
                  onClick={() => setHostState("form")}
                  disabled={!browserOk}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-medium rounded-lg px-4 py-2 transition-colors"
                >
                  <ScreenShare className="h-4 w-4" />
                  Jetzt starten
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── FORM ── */}
        {hostState === "form" && (
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-foreground mb-2">Bildschirm freigeben</h2>
            <p className="text-muted-foreground text-sm mb-8">
              Gib einen Namen für diesen PC ein und starte die Bildschirmfreigabe.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-2">
                  PC-Name
                </label>
                <input
                  data-testid="input-hostname"
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startSession()}
                  placeholder="z.B. Büro-PC, Gaming-Rechner"
                  autoFocus
                  className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                />
              </div>
              <button
                data-testid="button-start-session"
                onClick={startSession}
                disabled={!hostName.trim() || createSession.isPending}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-medium rounded-lg px-4 py-3 text-sm transition-colors flex items-center justify-center gap-2"
              >
                {createSession.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScreenShare className="h-4 w-4" />}
                Bildschirm freigeben
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
              Der Browser fragt dich, welches Fenster oder welchen Bildschirm du teilen möchtest.
            </p>
            <button onClick={() => setHostState("setup")} className="mt-3 text-xs text-muted-foreground hover:text-foreground underline transition-colors">
              Anleitung nochmal anzeigen
            </button>
          </div>
        )}

        {/* ── ACTIVE SESSION ── */}
        {(hostState === "waiting" || hostState === "connected") && sessionCode && (
          <div className="w-full max-w-2xl space-y-5">
            {/* Code card */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
                Verbindungscode — iPhone
              </div>
              <div className="flex items-center gap-4">
                <div data-testid="text-session-code" className="text-5xl font-mono font-bold tracking-widest text-primary">
                  {sessionCode}
                </div>
                <button
                  data-testid="button-copy-code"
                  onClick={copyCode}
                  className="ml-auto flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors"
                >
                  {copied ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Kopiert" : "Kopieren"}
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Diesen Code auf dem iPhone eingeben unter{" "}
                <button onClick={copyUrl} className="font-mono text-foreground text-xs hover:text-primary transition-colors underline decoration-dashed">
                  {window.location.origin}/connect
                </button>
              </p>
            </div>

            {/* Status checklist */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">Status</div>
              <div className="space-y-3">
                {[
                  { done: true, label: "Session erstellt" },
                  { done: true, label: "Bildschirmfreigabe aktiv" },
                  {
                    done: hostState === "connected",
                    label: hostState === "connected" ? "iPhone verbunden" : "Warte auf iPhone...",
                    pending: hostState === "waiting",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    {item.pending ? (
                      <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
                    ) : item.done ? (
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live preview */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Circle className="h-3 w-3 fill-emerald-400 text-emerald-400" />
                <span className="text-xs font-mono text-muted-foreground">Live-Vorschau — {hostName}</span>
              </div>
              <video
                ref={localVideoRef}
                data-testid="video-preview"
                autoPlay muted playsInline
                className="w-full aspect-video bg-black object-contain"
              />
            </div>

            <button
              data-testid="button-stop-session"
              onClick={stopSession}
              className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 border border-destructive/30 hover:border-destructive/60 rounded-lg px-4 py-2.5 transition-colors"
            >
              <StopCircle className="h-4 w-4" />
              Session beenden
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {hostState === "error" && (
          <div className="w-full max-w-md text-center">
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-8">
              <X className="h-8 w-8 text-destructive mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Fehler</h3>
              <p className="text-sm text-muted-foreground mb-6">{errorMsg}</p>
              <div className="flex flex-col gap-2 items-center">
                <button
                  data-testid="button-retry"
                  onClick={() => { setHostState("form"); setErrorMsg(""); }}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Erneut versuchen
                </button>
                <button
                  onClick={() => { setHostState("setup"); setErrorMsg(""); setActiveStep(0); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Zur Anleitung
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

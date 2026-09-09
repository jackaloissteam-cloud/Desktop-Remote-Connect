import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Smartphone, ArrowLeft, Loader2, X, Maximize2 } from "lucide-react";
import { wsManager } from "@/lib/ws";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type ConnectState = "idle" | "connecting" | "connected" | "error";

export default function Connect() {
  const [, setLocation] = useLocation();

  const [code, setCode] = useState("");
  const [connectState, setConnectState] = useState<ConnectState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    wsManager.disconnect();
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const handleSignalingMessage = useCallback(
    async (msg: Parameters<typeof wsManager["subscribe"]>[0] extends (msg: infer M) => void ? M : never) => {
      if (msg.type === "offer" && pcRef.current) {
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(msg.data as RTCSessionDescriptionInit)
        );
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        wsManager.send({ type: "answer", code, data: answer });
      } else if (msg.type === "ice-candidate" && pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(
            new RTCIceCandidate(msg.data as RTCIceCandidateInit)
          );
        } catch {
          // ignore
        }
      } else if (msg.type === "host-disconnected") {
        setConnectState("error");
        setErrorMsg("The host disconnected from the session.");
        cleanup();
      }
    },
    [code, cleanup]
  );

  useEffect(() => {
    const unsub = wsManager.subscribe(handleSignalingMessage as Parameters<typeof wsManager["subscribe"]>[0]);
    return () => { unsub(); };
  }, [handleSignalingMessage]);

  const connect = () => {
    if (code.length !== 6) return;
    setConnectState("connecting");

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
        setConnectState("connected");
      }
    };

    pc.ondatachannel = (e) => {
      dataChannelRef.current = e.channel;
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        wsManager.send({ type: "ice-candidate", code, data: e.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setConnectState("error");
        setErrorMsg("Connection lost. The host may have ended the session.");
        cleanup();
      }
    };

    wsManager.connect();
    setTimeout(() => {
      wsManager.send({ type: "register", code, role: "client" });
    }, 500);
  };

  const disconnect = () => {
    cleanup();
    setConnectState("idle");
    setCode("");
    setErrorMsg("");
  };

  const sendTouchEvent = (type: "mousemove" | "click", e: React.Touch | React.MouseEvent, rect: DOMRect) => {
    const clientX = "clientX" in e ? e.clientX : (e as React.Touch).clientX;
    const clientY = "clientY" in e ? e.clientY : (e as React.Touch).clientY;
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify({ type, x, y }));
    }
  };

  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    sendTouchEvent("click", e, rect);
  };

  const handleVideoTouch = (e: React.TouchEvent<HTMLVideoElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    for (let i = 0; i < e.touches.length; i++) {
      sendTouchEvent("mousemove", e.touches[i], rect);
    }
  };

  const handleVideoTouchEnd = (e: React.TouchEvent<HTMLVideoElement>) => {
    if (e.changedTouches.length > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      sendTouchEvent("click", e.changedTouches[0], rect);
    }
  };

  const toggleFullscreen = () => {
    if (!fullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setFullscreen(!fullscreen);
  };

  const codeDigits = code.padEnd(6, " ").split("");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <button
          data-testid="button-back"
          onClick={() => { disconnect(); setLocation("/"); }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Smartphone className="h-5 w-5 text-accent" />
        <span className="font-semibold text-foreground">Connect to PC</span>
        {connectState === "connected" && (
          <span className="ml-auto flex items-center gap-1.5 text-xs font-mono text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {connectState === "idle" && (
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-bold text-foreground mb-2">Enter connection code</h2>
            <p className="text-muted-foreground text-sm mb-8">
              Open RemoteLink on the PC and enter the 6-digit code shown there.
            </p>

            {/* Code display */}
            <div className="flex gap-2 justify-center mb-6">
              {codeDigits.map((d, i) => (
                <div
                  key={i}
                  className={`w-10 h-12 flex items-center justify-center border rounded-lg font-mono text-xl font-bold transition-colors ${
                    d.trim()
                      ? "border-primary text-foreground bg-card"
                      : "border-border text-transparent bg-card"
                  }`}
                >
                  {d.trim() || "0"}
                </div>
              ))}
            </div>

            <input
              data-testid="input-code"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && code.length === 6 && connect()}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground text-center text-2xl font-mono tracking-widest placeholder:text-muted-foreground placeholder:text-base placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-colors mb-4"
            />
            <button
              data-testid="button-connect"
              onClick={connect}
              disabled={code.length !== 6}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-accent-foreground font-medium rounded-lg px-4 py-3 text-sm transition-colors"
            >
              Connect
            </button>
          </div>
        )}

        {connectState === "connecting" && (
          <div className="text-center">
            <Loader2 className="h-10 w-10 text-accent animate-spin mx-auto mb-4" />
            <p className="text-foreground font-medium mb-1">Connecting...</p>
            <p className="text-muted-foreground text-sm">Waiting for the host to accept</p>
          </div>
        )}

        {connectState === "connected" && (
          <div ref={containerRef} className="w-full max-w-4xl space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-muted-foreground">
                Code: <span className="text-foreground">{code}</span>
              </p>
              <div className="flex items-center gap-3">
                <button
                  data-testid="button-fullscreen"
                  onClick={toggleFullscreen}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Toggle fullscreen"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <button
                  data-testid="button-disconnect"
                  onClick={disconnect}
                  className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 border border-destructive/30 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Disconnect
                </button>
              </div>
            </div>

            <div className="bg-black rounded-xl overflow-hidden border border-border">
              <video
                ref={remoteVideoRef}
                data-testid="video-remote"
                autoPlay
                playsInline
                className="w-full aspect-video object-contain cursor-crosshair"
                onClick={handleVideoClick}
                onTouchMove={handleVideoTouch}
                onTouchEnd={handleVideoTouchEnd}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Tap or click the screen to send input to the PC
            </p>
          </div>
        )}

        {connectState === "error" && (
          <div className="w-full max-w-md text-center">
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-8">
              <X className="h-8 w-8 text-destructive mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Connection failed</h3>
              <p className="text-sm text-muted-foreground mb-6">{errorMsg}</p>
              <button
                data-testid="button-retry"
                onClick={() => { setConnectState("idle"); setErrorMsg(""); setCode(""); }}
                className="text-sm font-medium text-accent hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

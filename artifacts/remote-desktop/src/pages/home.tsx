import { useLocation } from "wouter";
import { Monitor, Smartphone, Wifi, Shield, Zap, BookOpen } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <Monitor className="h-5 w-5 text-primary" />
        <span className="font-semibold text-foreground tracking-tight">RemoteLink</span>
        <button
          onClick={() => setLocation("/anleitung")}
          className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Anleitung
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-2xl w-full text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-mono px-3 py-1.5 rounded-full mb-6">
            <Wifi className="h-3 w-3" />
            WebRTC Peer-to-Peer
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight mb-4">
            Remote access.<br />
            <span className="text-primary">No software required.</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Share your Windows PC screen to your iPhone directly through the browser.
            Fast, encrypted, and private — no accounts, no installs.
          </p>
        </div>

        {/* Role selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl mb-12">
          <button
            data-testid="button-host"
            onClick={() => setLocation("/host")}
            className="group bg-card border border-border hover:border-primary/50 rounded-xl p-6 text-left transition-all duration-200 hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 rounded-lg p-2.5">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">PC</div>
                <div className="font-semibold text-foreground">Share Screen</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Start a session on your Windows PC. Get a 6-digit code to share with your iPhone.
            </p>
            <div className="mt-4 text-xs font-mono text-primary group-hover:translate-x-1 transition-transform duration-200">
              Open on PC →
            </div>
          </button>

          <button
            data-testid="button-connect"
            onClick={() => setLocation("/connect")}
            className="group bg-card border border-border hover:border-accent/50 rounded-xl p-6 text-left transition-all duration-200 hover:shadow-lg hover:shadow-accent/10"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-accent/10 rounded-lg p-2.5">
                <Smartphone className="h-5 w-5 text-accent" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">iPhone</div>
                <div className="font-semibold text-foreground">Connect to PC</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enter the 6-digit code on your iPhone to view and control the PC screen.
            </p>
            <div className="mt-4 text-xs font-mono text-accent group-hover:translate-x-1 transition-transform duration-200">
              Open on iPhone →
            </div>
          </button>
        </div>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary/60" />
            End-to-end encrypted
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary/60" />
            Low latency WebRTC
          </div>
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-primary/60" />
            No account needed
          </div>
        </div>
      </main>

      {/* How it works */}
      <section className="border-t border-border px-6 py-10">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-6 text-center">How it works</h2>
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { step: "01", title: "PC generates code", desc: "Start a session on your PC and get a 6-digit code." },
              { step: "02", title: "iPhone connects", desc: "Enter the code on your iPhone to establish a connection." },
              { step: "03", title: "Remote control", desc: "View the screen and send touch events back to the PC." },
            ].map((item) => (
              <div key={item.step}>
                <div className="text-xs font-mono text-primary mb-2">{item.step}</div>
                <div className="text-sm font-medium text-foreground mb-1">{item.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

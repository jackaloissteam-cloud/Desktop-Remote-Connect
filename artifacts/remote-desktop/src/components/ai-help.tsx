import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

const initialMessage: ChatMessage = {
  role: "assistant",
  content:
    "Hallo! Ich helfe dir bei der PC-Einrichtung, der iPhone-Verbindung und typischen WebRTC- oder WLAN-Problemen. Beschreibe einfach, was nicht funktioniert.",
};

export default function AiHelp() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || isSending) return;

    setInput("");
    setMessages((current) => [...current, { role: "user", content: message }]);
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/troubleshoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: `Die Hilfe wurde aus dem RemoteLink-Webclient geöffnet. Aktuelle Ansicht: ${window.location.pathname}`,
        }),
      });
      const data = (await response.json()) as { answer?: string; error?: string };

      if (!response.ok || !data.answer) {
        throw new Error(data.error || "Keine Antwort erhalten");
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.answer! },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error && error.message
              ? error.message
              : "Die KI-Hilfe ist gerade nicht erreichbar. Prüfe bitte, ob der API-Server läuft.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && (
        <section
          id="ai-help-panel"
          aria-label="KI-Hilfe"
          className="flex h-[min(600px,calc(100vh-7rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/30"
        >
          <header className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">KI-Hilfe</h2>
              <p className="text-xs text-muted-foreground">Einrichtung & Fehlerbehebung</p>
            </div>
            <Sparkles className="ml-auto h-4 w-4 text-primary/70" />
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md bg-muted text-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Prüfe das Problem …
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-border p-3">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Was funktioniert nicht?"
              aria-label="Frage an die KI-Hilfe"
              maxLength={2_000}
              rows={2}
              disabled={isSending}
              className="mb-2 resize-none bg-background text-sm"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                Keine Passwörter oder Zugangsdaten senden.
              </span>
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || isSending}
                aria-label="Frage senden"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </section>
      )}

      <Button
        type="button"
        size="lg"
        onClick={() => setOpen((current) => !current)}
        className="gap-2 rounded-full px-4 shadow-lg shadow-primary/20"
        aria-expanded={open}
        aria-controls="ai-help-panel"
      >
        <Bot className="h-4 w-4" />
        KI-Hilfe
      </Button>
    </div>
  );
}
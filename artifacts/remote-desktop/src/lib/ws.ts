export type WSMessage = 
  | { type: "register"; code: string; role: "host" | "client" }
  | { type: "peer-joined" }
  | { type: "host-disconnected" }
  | { type: "client-disconnected" }
  | { type: "registered"; role: string; code: string }
  | { type: "error"; message: string }
  | { type: "offer"; code: string; data: RTCSessionDescriptionInit }
  | { type: "answer"; code: string; data: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; code: string; data: RTCIceCandidateInit };

type MessageHandler = (msg: WSMessage) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private isConnecting = false;
  private queue: WSMessage[] = [];

  public connect() {
    if (this.ws || this.isConnecting) return;
    this.isConnecting = true;
    
    const wsUrl = window.location.origin.replace(/^http/, 'ws') + '/api/ws';
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isConnecting = false;
      this.flushQueue();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage;
        this.handlers.forEach(h => h(msg));
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.isConnecting = false;
      setTimeout(() => this.connect(), 1000);
    };
  }

  public subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  public send(msg: WSMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.queue.push(msg);
      this.connect();
    }
  }

  private flushQueue() {
    while (this.queue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const msg = this.queue.shift();
      if (msg) this.ws.send(JSON.stringify(msg));
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.queue = [];
  }
}

export const wsManager = new WebSocketManager();

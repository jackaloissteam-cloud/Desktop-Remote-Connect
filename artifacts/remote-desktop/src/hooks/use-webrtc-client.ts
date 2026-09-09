import { useEffect, useRef, useState, useCallback } from "react";
import { wsManager, WSMessage } from "@/lib/ws";

export function useWebRTCClient(code: string | undefined) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!code) return;

    wsManager.connect();
    wsManager.send({ type: "register", code, role: "client" });

    const handleMessage = async (msg: WSMessage) => {
      if (msg.type === "offer") {
        pcRef.current = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        pcRef.current.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
          setIsConnected(true);
        };

        pcRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            wsManager.send({ type: "ice-candidate", code, data: event.candidate.toJSON() });
          }
        };

        pcRef.current.ondatachannel = (event) => {
          dataChannelRef.current = event.channel;
        };

        await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.data));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        wsManager.send({ type: "answer", code, data: answer });
      } else if (msg.type === "ice-candidate" && pcRef.current) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.data));
      }
    };

    const unsubscribe = wsManager.subscribe(handleMessage);
    return () => {
      unsubscribe();
      pcRef.current?.close();
      wsManager.disconnect();
    };
  }, [code]);

  const sendMouseEvent = useCallback((type: "mousemove" | "click", x: number, y: number) => {
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify({ type, x, y }));
    }
  }, []);

  const disconnect = useCallback(() => {
    pcRef.current?.close();
    wsManager.disconnect();
    setRemoteStream(null);
    setIsConnected(false);
  }, []);

  return { remoteStream, isConnected, sendMouseEvent, disconnect };
}

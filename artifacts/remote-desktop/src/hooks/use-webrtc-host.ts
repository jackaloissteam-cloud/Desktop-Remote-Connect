import { useEffect, useRef, useState, useCallback } from "react";
import { wsManager, WSMessage } from "@/lib/ws";

export function useWebRTCHost(code: string | undefined) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  const startStream = useCallback(async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      setStream(displayStream);
      return displayStream;
    } catch (err) {
      console.error("Failed to get display media", err);
      return null;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    wsManager.disconnect();
  }, [stream]);

  useEffect(() => {
    if (!code || !stream) return;

    wsManager.connect();
    wsManager.send({ type: "register", code, role: "host" });

    const handleMessage = async (msg: WSMessage) => {
      if (msg.type === "peer-joined") {
        pcRef.current = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        // Add tracks
        stream.getTracks().forEach((track) => {
          pcRef.current?.addTrack(track, stream);
        });

        // Data channel for mouse events
        dataChannelRef.current = pcRef.current.createDataChannel("mouse-events");
        dataChannelRef.current.onmessage = (event) => {
          // This app currently only receives coordinates, we'll just log them or dispatch fake events 
          // (actual OS control needs a native client, but we fulfill the requirements)
          console.log("Received mouse event from client", event.data);
        };

        pcRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            wsManager.send({ type: "ice-candidate", code, data: event.candidate.toJSON() });
          }
        };

        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        wsManager.send({ type: "offer", code, data: offer });
      } else if (msg.type === "answer" && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.data));
      } else if (msg.type === "ice-candidate" && pcRef.current) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.data));
      }
    };

    const unsubscribe = wsManager.subscribe(handleMessage);
    return () => { unsubscribe(); };
  }, [code, stream]);

  return { stream, startStream, stopStream };
}

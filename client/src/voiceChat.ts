import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

export type VoiceStatus = "idle" | "requesting" | "connected" | "listen-only" | "unsupported";
export type ParticipantAudio = { volume: number; muted: boolean };

type VoiceSignal = {
  code?: string;
  senderUserId?: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit | null;
};

type VoicePeer = {
  connection: RTCPeerConnection;
  audio: HTMLAudioElement;
  pendingCandidates: Array<RTCIceCandidateInit | null>;
};

const STORAGE_KEY = "escalera:voice-participants";
const SELF_MUTE_STORAGE_KEY = "escalera:voice-self-muted";
const DEFAULT_AUDIO: ParticipantAudio = { volume: 1, muted: false };

export function normalizeParticipantVolume(volume: number) {
  return Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 1));
}

export function applySelfMute(stream: Pick<MediaStream, "getAudioTracks">, muted: boolean) {
  stream.getAudioTracks().forEach((track) => { track.enabled = !muted; });
}

export function readSelfMuted(storage: Pick<Storage, "getItem">) {
  try { return storage.getItem(SELF_MUTE_STORAGE_KEY) === "true"; }
  catch { return false; }
}

export function writeSelfMuted(storage: Pick<Storage, "setItem">, muted: boolean) {
  try { storage.setItem(SELF_MUTE_STORAGE_KEY, String(muted)); } catch { /* storage is optional */ }
}

function loadPreferences(): Record<string, ParticipantAudio> {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!value || typeof value !== "object") return {};
    return Object.fromEntries(Object.entries(value).flatMap(([userId, entry]) => {
      const candidate = entry as Partial<ParticipantAudio>;
      if (typeof candidate.volume !== "number" || typeof candidate.muted !== "boolean") return [];
      return [[userId, { volume: normalizeParticipantVolume(candidate.volume), muted: candidate.muted }]];
    }));
  } catch { return {}; }
}

function savePreferences(preferences: Record<string, ParticipantAudio>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Private browsing may deny storage. */ }
}

export function useLobbyVoice(
  socket: Socket | null,
  lobbyCode: string | null,
  userId: string | null,
  connectedUserIds: string[]
) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [notice, setNotice] = useState("");
  const [preferences, setPreferences] = useState<Record<string, ParticipantAudio>>(loadPreferences);
  const [selfMuted, setSelfMuted] = useState(() => readSelfMuted(localStorage));
  const preferencesRef = useRef(preferences);
  const selfMutedRef = useRef(selfMuted);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef(new Map<string, VoicePeer>());
  const connectedRef = useRef(connectedUserIds);
  const reconcileRef = useRef<(userIds: string[]) => void>(() => undefined);

  useEffect(() => { preferencesRef.current = preferences; savePreferences(preferences); }, [preferences]);
  useEffect(() => {
    selfMutedRef.current = selfMuted;
    writeSelfMuted(localStorage, selfMuted);
    if (localStreamRef.current) applySelfMute(localStreamRef.current, selfMuted);
  }, [selfMuted]);
  useEffect(() => {
    connectedRef.current = connectedUserIds;
    reconcileRef.current(connectedUserIds);
  }, [connectedUserIds.join("|")]);

  const applyPreference = useCallback((targetUserId: string, value: ParticipantAudio) => {
    const audio = peersRef.current.get(targetUserId)?.audio;
    if (!audio) return;
    audio.volume = value.volume;
    audio.muted = value.muted;
  }, []);

  const updatePreference = useCallback((targetUserId: string, update: (current: ParticipantAudio) => ParticipantAudio) => {
    setPreferences((current) => {
      const nextValue = update(current[targetUserId] ?? DEFAULT_AUDIO);
      const next = { ...current, [targetUserId]: nextValue };
      applyPreference(targetUserId, nextValue);
      return next;
    });
  }, [applyPreference]);

  const setVolume = useCallback((targetUserId: string, volume: number) => {
    updatePreference(targetUserId, (current) => ({ ...current, volume: normalizeParticipantVolume(volume) }));
  }, [updatePreference]);

  const toggleMuted = useCallback((targetUserId: string) => {
    updatePreference(targetUserId, (current) => ({ ...current, muted: !current.muted }));
  }, [updatePreference]);

  const toggleSelfMuted = useCallback(() => setSelfMuted((current) => !current), []);

  useEffect(() => {
    if (!socket || !lobbyCode || !userId) {
      setStatus("idle");
      setNotice("");
      return;
    }

    const code = lobbyCode.toUpperCase();
    let disposed = false;
    let localStream: MediaStream | null = null;
    const peers = peersRef.current;
    setStatus("requesting");
    setNotice("");

    const closePeer = (targetUserId: string) => {
      const peer = peers.get(targetUserId);
      if (!peer) return;
      peer.connection.onicecandidate = null;
      peer.connection.ontrack = null;
      peer.connection.close();
      peer.audio.pause();
      peer.audio.srcObject = null;
      peer.audio.remove();
      peers.delete(targetUserId);
    };

    const mediaReady = (async () => {
      if (!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia) {
        setStatus("unsupported");
        setNotice("Voice-Chat wird von diesem Browser nicht unterstützt.");
        return null;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false
        });
        if (disposed) { stream.getTracks().forEach((track) => track.stop()); return null; }
        localStream = stream;
        localStreamRef.current = stream;
        applySelfMute(stream, selfMutedRef.current);
        setStatus("connected");
        return stream;
      } catch {
        if (!disposed) {
          setStatus("listen-only");
          setNotice("Mikrofonzugriff fehlt. Du kannst dem Voice-Chat weiterhin zuhören.");
        }
        return null;
      }
    })();

    const ensurePeer = (targetUserId: string, stream: MediaStream | null) => {
      const existing = peers.get(targetUserId);
      if (existing) return existing;
      const connection = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      const audio = new Audio();
      audio.autoplay = true;
      audio.setAttribute("playsinline", "");
      const preference = preferencesRef.current[targetUserId] ?? DEFAULT_AUDIO;
      audio.volume = preference.volume;
      audio.muted = preference.muted;
      if (stream) stream.getAudioTracks().forEach((track) => connection.addTrack(track, stream));
      else connection.addTransceiver("audio", { direction: "recvonly" });
      const peer: VoicePeer = { connection, audio, pendingCandidates: [] };
      peers.set(targetUserId, peer);
      connection.onicecandidate = (event) => {
        if (!disposed && event.candidate) socket.emit("voice:signal", { code, targetUserId, candidate: event.candidate.toJSON() });
      };
      connection.ontrack = (event) => {
        audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
        void audio.play().catch(() => setNotice("Tippe einmal auf die Seite, um Voice-Audio abzuspielen."));
      };
      connection.onconnectionstatechange = () => {
        if (["failed", "closed"].includes(connection.connectionState)) closePeer(targetUserId);
      };
      return peer;
    };

    const makeOffer = async (targetUserId: string) => {
      const stream = await mediaReady;
      if (disposed || !connectedRef.current.includes(targetUserId)) return;
      const peer = ensurePeer(targetUserId, stream);
      if (peer.connection.signalingState !== "stable") return;
      const offer = await peer.connection.createOffer();
      await peer.connection.setLocalDescription(offer);
      if (!disposed) socket.emit("voice:signal", { code, targetUserId, description: peer.connection.localDescription });
    };

    const reconcile = (targetUserIds: string[]) => {
      const desired = new Set(targetUserIds.filter((targetUserId) => targetUserId !== userId));
      for (const targetUserId of peers.keys()) if (!desired.has(targetUserId)) closePeer(targetUserId);
      for (const targetUserId of desired) if (userId.localeCompare(targetUserId) < 0) void makeOffer(targetUserId);
    };
    reconcileRef.current = reconcile;

    const onParticipants = (value: { code?: string; userIds?: string[] }) => {
      if (value.code?.toUpperCase() === code && Array.isArray(value.userIds)) reconcile(value.userIds);
    };
    const onParticipantJoined = (value: { code?: string; userId?: string }) => {
      if (value.code?.toUpperCase() !== code || !value.userId || value.userId === userId) return;
      if (userId.localeCompare(value.userId) < 0) void makeOffer(value.userId);
    };
    const onParticipantLeft = (value: { code?: string; userId?: string }) => {
      if (value.code?.toUpperCase() === code && value.userId) closePeer(value.userId);
    };
    const onSignal = async (value: VoiceSignal) => {
      if (value.code?.toUpperCase() !== code || !value.senderUserId || value.senderUserId === userId) return;
      const stream = await mediaReady;
      if (disposed) return;
      const peer = ensurePeer(value.senderUserId, stream);
      if (value.description) {
        await peer.connection.setRemoteDescription(value.description);
        for (const candidate of peer.pendingCandidates.splice(0)) await peer.connection.addIceCandidate(candidate);
        if (value.description.type === "offer") {
          const answer = await peer.connection.createAnswer();
          await peer.connection.setLocalDescription(answer);
          socket.emit("voice:signal", { code, targetUserId: value.senderUserId, description: peer.connection.localDescription });
        }
      } else if (value.candidate !== undefined) {
        if (peer.connection.remoteDescription) await peer.connection.addIceCandidate(value.candidate);
        else peer.pendingCandidates.push(value.candidate);
      }
    };

    socket.on("voice:participants", onParticipants);
    socket.on("voice:participant-joined", onParticipantJoined);
    socket.on("voice:participant-left", onParticipantLeft);
    socket.on("voice:signal", onSignal);
    void mediaReady.then(() => { if (!disposed) reconcile(connectedRef.current); });

    return () => {
      disposed = true;
      reconcileRef.current = () => undefined;
      socket.off("voice:participants", onParticipants);
      socket.off("voice:participant-joined", onParticipantJoined);
      socket.off("voice:participant-left", onParticipantLeft);
      socket.off("voice:signal", onSignal);
      for (const targetUserId of [...peers.keys()]) closePeer(targetUserId);
      localStream?.getTracks().forEach((track) => track.stop());
      if (localStreamRef.current === localStream) localStreamRef.current = null;
      setStatus("idle");
      setNotice("");
    };
  }, [lobbyCode, socket, userId]);

  return useMemo(() => ({
    status,
    notice,
    selfMuted,
    canSelfMute: status === "connected",
    participant: (targetUserId: string) => preferences[targetUserId] ?? DEFAULT_AUDIO,
    setVolume,
    toggleMuted,
    toggleSelfMuted
  }), [notice, preferences, selfMuted, setVolume, status, toggleMuted, toggleSelfMuted]);
}

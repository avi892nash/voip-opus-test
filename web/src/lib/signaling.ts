// Typed WebSocket client speaking the project's signaling protocol.
// Connects to /ws?token=<jwt>. Auth happens at WS handshake.

import type { User } from './api';

type MessageType =
  | 'websocket-connected'
  | 'contacts-update'
  | 'call-request'
  | 'call-response'
  | 'call-failed'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'hang-up'
  | 'room-create'
  | 'room-join'
  | 'room-leave'
  | 'room-joined'
  | 'room-left'
  | 'room-error'
  | 'participant-joined'
  | 'participant-left'
  | 'error';

export interface SignalMessage<T = unknown> {
  type: MessageType;
  data?: T;
  from?: string;
  to?: string;
  timestamp?: number;
}

export interface IncomingCall {
  callerId: string;
  callerName: string;
}

export interface CallResponseData {
  accepted: boolean;
}

export interface RoomJoinedData {
  code: string;
  you: User;
  participants: User[];
}

export interface ParticipantJoinedData {
  code: string;
  participant: User;
}

export interface ParticipantLeftData {
  code: string;
  userId: string;
}

type Handler<T = unknown> = (msg: SignalMessage<T>) => void;

export interface SignalingHandlers {
  // generic
  onConnected?: Handler;
  onContactsUpdate?: (users: User[]) => void;
  onError?: (err: string) => void;
  onClose?: () => void;

  // 1:1 calls
  onIncomingCall?: (call: IncomingCall, from: string) => void;
  onCallResponse?: (data: CallResponseData, from: string) => void;
  onCallFailed?: (data: { reason: string }) => void;

  // rooms
  onRoomJoined?: (data: RoomJoinedData) => void;
  onRoomLeft?: (code: string) => void;
  onRoomError?: (reason: string) => void;
  onParticipantJoined?: (data: ParticipantJoinedData) => void;
  onParticipantLeft?: (data: ParticipantLeftData) => void;

  // per-peer signaling (works for both 1:1 and rooms)
  onOffer?: (sdp: RTCSessionDescriptionInit, from: string) => void;
  onAnswer?: (sdp: RTCSessionDescriptionInit, from: string) => void;
  onIceCandidate?: (candidate: RTCIceCandidateInit, from: string) => void;
  onHangUp?: (from: string) => void;
}

export class SignalingClient {
  private ws: WebSocket | null = null;
  private handlers: SignalingHandlers;
  private url: string;
  private reconnectAttempts = 0;
  private intentionallyClosed = false;
  // Queue outbound messages while the socket is mid-connect so callers don't
  // have to await `onConnected` themselves.
  private outbox: string[] = [];

  constructor(token: string, handlers: SignalingHandlers) {
    this.handlers = handlers;

    const envWs = (import.meta.env.VITE_WS_URL as string | undefined) ?? '';
    if (envWs) {
      this.url = `${envWs.replace(/\/$/, '')}/ws?token=${encodeURIComponent(token)}`;
    } else {
      // Use page protocol + host (Vite proxies /ws → backend in dev).
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.url = `${proto}//${location.host}/ws?token=${encodeURIComponent(token)}`;
    }
  }

  connect() {
    this.intentionallyClosed = false;
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      // Flush anything queued while we were connecting.
      for (const m of this.outbox) this.ws?.send(m);
      this.outbox = [];
    };
    this.ws.onmessage = (ev) => this.handle(ev);
    this.ws.onclose = () => {
      this.handlers.onClose?.();
      if (!this.intentionallyClosed && this.reconnectAttempts < 5) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10_000);
        setTimeout(() => this.connect(), delay);
      }
    };
    this.ws.onerror = () => {
      this.handlers.onError?.('WebSocket error');
    };
  }

  close() {
    this.intentionallyClosed = true;
    this.ws?.close();
    this.ws = null;
  }

  private handle(ev: MessageEvent) {
    let msg: SignalMessage;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      this.handlers.onError?.('Bad message from server');
      return;
    }
    switch (msg.type) {
      case 'websocket-connected':
        this.handlers.onConnected?.(msg);
        break;
      case 'contacts-update':
        this.handlers.onContactsUpdate?.((msg.data as User[]) ?? []);
        break;
      case 'call-request':
        this.handlers.onIncomingCall?.(msg.data as IncomingCall, msg.from ?? '');
        break;
      case 'call-response':
        this.handlers.onCallResponse?.(msg.data as CallResponseData, msg.from ?? '');
        break;
      case 'call-failed':
        this.handlers.onCallFailed?.(msg.data as { reason: string });
        break;
      case 'room-joined':
        this.handlers.onRoomJoined?.(msg.data as RoomJoinedData);
        break;
      case 'room-left':
        this.handlers.onRoomLeft?.((msg.data as { code: string })?.code ?? '');
        break;
      case 'room-error':
        this.handlers.onRoomError?.((msg.data as { reason: string })?.reason ?? 'unknown');
        break;
      case 'participant-joined':
        this.handlers.onParticipantJoined?.(msg.data as ParticipantJoinedData);
        break;
      case 'participant-left':
        this.handlers.onParticipantLeft?.(msg.data as ParticipantLeftData);
        break;
      case 'offer':
        this.handlers.onOffer?.(msg.data as RTCSessionDescriptionInit, msg.from ?? '');
        break;
      case 'answer':
        this.handlers.onAnswer?.(msg.data as RTCSessionDescriptionInit, msg.from ?? '');
        break;
      case 'ice-candidate':
        this.handlers.onIceCandidate?.(msg.data as RTCIceCandidateInit, msg.from ?? '');
        break;
      case 'hang-up':
        this.handlers.onHangUp?.(msg.from ?? '');
        break;
      case 'error':
        this.handlers.onError?.((msg.data as { message: string })?.message ?? 'unknown error');
        break;
    }
  }

  private send(type: MessageType, to: string | undefined, data: unknown) {
    const payload = JSON.stringify({ type, to, data, timestamp: Date.now() });
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      this.outbox.push(payload);
    }
  }

  // 1:1 call ---------------------------------------------------------------
  callRequest(to: string) {
    this.send('call-request', to, {});
  }
  callResponse(to: string, accepted: boolean) {
    this.send('call-response', to, { accepted });
  }

  // Rooms ------------------------------------------------------------------
  createRoom(code?: string) {
    this.send('room-create', undefined, code ? { code } : {});
  }
  joinRoom(code: string) {
    this.send('room-join', undefined, { code });
  }
  leaveRoom() {
    this.send('room-leave', undefined, {});
  }

  // Per-peer signaling -----------------------------------------------------
  offer(to: string, sdp: RTCSessionDescriptionInit) {
    this.send('offer', to, sdp);
  }
  answer(to: string, sdp: RTCSessionDescriptionInit) {
    this.send('answer', to, sdp);
  }
  iceCandidate(to: string, candidate: RTCIceCandidateInit) {
    this.send('ice-candidate', to, candidate);
  }
  hangUp(to: string) {
    this.send('hang-up', to, {});
  }
}

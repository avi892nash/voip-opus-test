// Mesh-topology room manager.
//
// For N participants in a room, this class maintains N-1 RTCPeerConnections
// (one per peer). Audio packets flow directly between browsers — the server
// only relays the SDP + ICE handshake.
//
// Glare avoidance: when two peers see each other for the first time, only the
// one whose userId compares LARGER initiates the offer. This deterministic
// rule means we never end up with two offers crossing in flight.

import type { User } from './api';
import type {
  ParticipantJoinedData,
  ParticipantLeftData,
  RoomJoinedData,
  SignalingClient,
} from './signaling';

function iceServers(): RTCIceServer[] {
  const env = import.meta.env as Record<string, string | undefined>;
  const servers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  if (env.VITE_TURN_URL) {
    servers.push({
      urls: env.VITE_TURN_URL,
      username: env.VITE_TURN_USERNAME,
      credential: env.VITE_TURN_CREDENTIAL,
    });
  }
  return servers;
}

export interface Participant {
  user: User;
  /** ConnectionState of the underlying RTCPeerConnection. */
  state: RTCPeerConnectionState;
  /** Remote audio MediaStream; null until tracks arrive. */
  stream: MediaStream | null;
  /** True if the participant is the local user (no peer connection). */
  isSelf: boolean;
}

export interface RoomEvents {
  /** Fires every time the participant list or any participant's state changes. */
  onParticipantsChange?: (participants: Participant[]) => void;
  /** Fires when the local user is fully in the room. */
  onJoined?: (code: string) => void;
  /** Fires when the local user has left (voluntarily or kicked). */
  onLeft?: (code: string) => void;
  /** Errors specific to the room flow (bad code, etc.). */
  onError?: (reason: string) => void;
}

export class RoomManager {
  private signaling: SignalingClient;
  private events: RoomEvents;
  private code: string | null = null;
  private localUser: User | null = null;

  /** Microphone stream, shared across every outbound peer connection. */
  private localStream: MediaStream | null = null;

  /** One RTCPeerConnection per remote peer, keyed by their userId. */
  private peers = new Map<string, PeerLink>();

  constructor(signaling: SignalingClient, events: RoomEvents = {}) {
    this.signaling = signaling;
    this.events = events;
  }

  // -- public API ---------------------------------------------------------

  /** Acquire mic, then ask the server to create a room. */
  async createAndJoin(): Promise<void> {
    await this.acquireMic();
    this.signaling.createRoom();
  }

  /** Acquire mic, then ask the server to join an existing room code. */
  async joinByCode(code: string): Promise<void> {
    await this.acquireMic();
    this.signaling.joinRoom(code);
  }

  /** Tear everything down: leave the room, close every peer connection, stop the mic. */
  leave(): void {
    if (this.code) this.signaling.leaveRoom();
    this.shutdown();
  }

  setMuted(muted: boolean): void {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  /** Local mic MediaStream (or null before joining). For level meters. */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /** Map<peerId, RTCPeerConnection> — for stats / debugging. */
  getPeerConnections(): Map<string, RTCPeerConnection> {
    const out = new Map<string, RTCPeerConnection>();
    for (const [id, link] of this.peers) out.set(id, link.pc);
    return out;
  }

  /** Get a flat snapshot for rendering. Self entry is included first. */
  snapshot(): Participant[] {
    const out: Participant[] = [];
    if (this.localUser) {
      out.push({
        user: this.localUser,
        state: 'connected',
        stream: null,
        isSelf: true,
      });
    }
    for (const p of this.peers.values()) {
      out.push({ user: p.user, state: p.state, stream: p.stream, isSelf: false });
    }
    return out;
  }

  // -- signaling glue ------------------------------------------------------

  /**
   * Patch our handlers into the underlying SignalingClient. Called by the
   * host page after construction (kept separate from the constructor so the
   * host can attach its own listeners first if it wants to coexist).
   */
  bind(): void {
    // Save existing handlers so we don't clobber other listeners (e.g. the
    // 1:1 call page's IncomingCall handler).
    const prev = (this.signaling as unknown as { handlers: Record<string, unknown> }).handlers;
    const next = { ...prev };
    next.onRoomJoined = (d: RoomJoinedData) => this.handleRoomJoined(d);
    next.onRoomLeft = (code: string) => this.handleRoomLeft(code);
    next.onRoomError = (reason: string) => this.events.onError?.(reason);
    next.onParticipantJoined = (d: ParticipantJoinedData) => this.handleParticipantJoined(d);
    next.onParticipantLeft = (d: ParticipantLeftData) => this.handleParticipantLeft(d);
    next.onOffer = (sdp: RTCSessionDescriptionInit, from: string) => this.handleOffer(sdp, from);
    next.onAnswer = (sdp: RTCSessionDescriptionInit, from: string) => this.handleAnswer(sdp, from);
    next.onIceCandidate = (cand: RTCIceCandidateInit, from: string) => this.handleIce(cand, from);
    next.onHangUp = (from: string) => this.removePeer(from);
    (this.signaling as unknown as { handlers: Record<string, unknown> }).handlers = next;
  }

  // -- mic -----------------------------------------------------------------

  private async acquireMic(): Promise<MediaStream> {
    if (this.localStream) return this.localStream;
    console.info('[room] requesting mic');

    // See webrtc.ts setup() — same secure-context guard.
    if (!navigator.mediaDevices?.getUserMedia) {
      const url = location.origin;
      const msg =
        `Microphone access is blocked because this page isn't a secure context (${url}).\n\n` +
        `Open via http://localhost:5174 or behind HTTPS. LAN IPs don't qualify.`;
      console.error('[room] navigator.mediaDevices.getUserMedia is undefined', { origin: url });
      this.events.onError?.(msg);
      throw new Error(msg);
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (err) {
      console.error('[room] getUserMedia FAILED', err);
      this.events.onError?.(
        `Microphone access failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
    const tracks = this.localStream.getTracks();
    console.info('[room] mic acquired', {
      trackCount: tracks.length,
      tracks: tracks.map((t) => ({ kind: t.kind, label: t.label, enabled: t.enabled, muted: t.muted })),
    });
    return this.localStream;
  }

  // -- room events ---------------------------------------------------------

  private handleRoomJoined(d: RoomJoinedData) {
    this.code = d.code;
    this.localUser = d.you;
    // For every existing participant, decide who initiates and (if it's us)
    // create the offer.
    for (const peer of d.participants) {
      this.addPeer(peer);
      if (this.shouldInitiateTo(peer.id)) {
        void this.sendOffer(peer.id);
      }
    }
    this.events.onJoined?.(d.code);
    this.emitChange();
  }

  private handleRoomLeft(code: string) {
    this.events.onLeft?.(code);
    this.shutdown();
  }

  private handleParticipantJoined(d: ParticipantJoinedData) {
    // We're already in the room; a new peer just arrived. By convention the
    // newcomer is the side that compares "smaller", so they'll send us an
    // offer. We just need to register them and wait.
    this.addPeer(d.participant);
    if (this.shouldInitiateTo(d.participant.id)) {
      void this.sendOffer(d.participant.id);
    }
    this.emitChange();
  }

  private handleParticipantLeft(d: ParticipantLeftData) {
    this.removePeer(d.userId);
  }

  // -- peer connections ----------------------------------------------------

  private shouldInitiateTo(peerId: string): boolean {
    // Lexicographic compare — bigger id initiates. Stable across both browsers.
    if (!this.localUser) return false;
    return this.localUser.id > peerId;
  }

  private addPeer(user: User): PeerLink {
    const existing = this.peers.get(user.id);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: iceServers() });

    // Push our mic into the connection.
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
        console.info('[room] addTrack', { peerId: user.id, kind: track.kind, id: track.id });
      }
    } else {
      console.warn('[room] addPeer with no localStream yet — outgoing audio will be missing', { peerId: user.id });
    }

    const link: PeerLink = {
      user,
      pc,
      stream: null,
      state: 'new',
    };

    pc.ontrack = (ev) => {
      const incoming = ev.streams[0] ?? new MediaStream([ev.track]);
      console.info('[room] ontrack', {
        peerId: user.id,
        peerName: user.username,
        kind: ev.track.kind,
        trackId: ev.track.id,
        streamId: incoming.id,
        muted: ev.track.muted,
      });
      // Replace, don't append — using the remote's stream ID gives the
      // <audio> element a single stable stream from the start, so it can
      // start playback without waiting for additional ontrack events.
      link.stream = incoming;
      this.emitChange();
    };
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.signaling.iceCandidate(user.id, ev.candidate.toJSON());
      } else {
        console.info('[room] ICE gathering complete', { peerId: user.id });
      }
    };
    pc.oniceconnectionstatechange = () => {
      console.info('[room] iceConnectionState ->', pc.iceConnectionState, { peerId: user.id });
    };
    pc.onconnectionstatechange = () => {
      console.info('[room] connectionState ->', pc.connectionState, { peerId: user.id });
      link.state = pc.connectionState;
      this.emitChange();
      if (
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        this.removePeer(user.id);
      }
    };

    this.peers.set(user.id, link);
    return link;
  }

  private async sendOffer(peerId: string) {
    const link = this.peers.get(peerId);
    if (!link) return;
    console.info('[room] sendOffer ->', peerId);
    try {
      const offer = await link.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await link.pc.setLocalDescription(offer);
      this.signaling.offer(peerId, offer);
      console.info('[room] offer sent', { peerId });
    } catch (err) {
      console.error('[room] createOffer/setLocalDescription failed', err, { peerId });
      this.events.onError?.(
        `Could not start audio with peer: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async handleOffer(sdp: RTCSessionDescriptionInit, from: string) {
    console.info('[room] handleOffer from', from);
    // We may not have registered this peer yet — happens if the offer arrives
    // before the participant-joined event (rare but possible). Lazy-create.
    let link = this.peers.get(from);
    if (!link) {
      console.info('[room] lazy-creating peer link', { from });
      link = this.addPeer({
        id: from,
        username: '...',
        email: '',
        created_at: '',
      });
    }
    try {
      await link.pc.setRemoteDescription(sdp);
      const answer = await link.pc.createAnswer();
      await link.pc.setLocalDescription(answer);
      this.signaling.answer(from, answer);
      console.info('[room] answer sent', { from });
    } catch (err) {
      console.error('[room] handleOffer failed', err, { from });
      this.events.onError?.(
        `Failed to accept incoming audio: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async handleAnswer(sdp: RTCSessionDescriptionInit, from: string) {
    const link = this.peers.get(from);
    if (!link) return;
    try {
      await link.pc.setRemoteDescription(sdp);
    } catch (err) {
      console.warn('setRemoteDescription(answer) failed', err);
    }
  }

  private async handleIce(cand: RTCIceCandidateInit, from: string) {
    const link = this.peers.get(from);
    if (!link) return;
    try {
      await link.pc.addIceCandidate(cand);
    } catch {
      // late/duplicate candidates are normal; ignore.
    }
  }

  private removePeer(peerId: string) {
    const link = this.peers.get(peerId);
    if (!link) return;
    try {
      link.pc.close();
    } catch {
      /* ignore */
    }
    this.peers.delete(peerId);
    this.emitChange();
  }

  // -- shutdown ------------------------------------------------------------

  private shutdown() {
    for (const peerId of Array.from(this.peers.keys())) this.removePeer(peerId);
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.code = null;
    this.localUser = null;
    this.emitChange();
  }

  private emitChange() {
    this.events.onParticipantsChange?.(this.snapshot());
  }
}

interface PeerLink {
  user: User;
  pc: RTCPeerConnection;
  stream: MediaStream | null;
  state: RTCPeerConnectionState;
}

// Thin wrapper around RTCPeerConnection for audio-only calls.
// Pairs with SignalingClient to exchange SDP and ICE.

import type { SignalingClient } from './signaling';

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

export interface CallEvents {
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionState?: (state: RTCPeerConnectionState) => void;
  onEnded?: () => void;
}

export class Call {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  public peerId: string;
  private signaling: SignalingClient;
  private events: CallEvents;
  private ended = false;

  constructor(peerId: string, signaling: SignalingClient, events: CallEvents = {}) {
    this.peerId = peerId;
    this.signaling = signaling;
    this.events = events;
  }

  /** Acquire mic and prepare the peer connection. */
  private async setup(): Promise<RTCPeerConnection> {
    console.info('[webrtc] setup() — requesting mic', { peerId: this.peerId });

    // Hard guard: navigator.mediaDevices is only defined in a "secure
    // context" (https, localhost, 127.0.0.1). On a LAN IP without TLS the
    // API is literally undefined — without this check we'd crash with a
    // confusing TypeError. Throw a real error the UI can surface.
    if (!navigator.mediaDevices?.getUserMedia) {
      const url = location.origin;
      const msg =
        `Microphone access is blocked because this page isn't a secure context (${url}).\n\n` +
        `Fix: open this app via http://localhost:5174 or behind HTTPS. Plain LAN IPs ` +
        `(http://192.168.x.x:…) don't qualify, by browser policy.`;
      console.error('[webrtc] navigator.mediaDevices.getUserMedia is undefined', { origin: url });
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
      console.error('[webrtc] getUserMedia FAILED', err);
      throw err;
    }

    const tracks = this.localStream.getTracks();
    console.info('[webrtc] mic acquired', {
      trackCount: tracks.length,
      tracks: tracks.map((t) => ({ kind: t.kind, label: t.label, enabled: t.enabled, muted: t.muted, readyState: t.readyState })),
    });

    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    this.pc = pc;

    for (const track of this.localStream.getTracks()) {
      pc.addTrack(track, this.localStream);
      console.info('[webrtc] addTrack', { kind: track.kind, id: track.id });
    }

    pc.ontrack = (ev) => {
      // Prefer the stream the remote attached the track to (if any) so the
      // <audio> element receives a stream that already contains all tracks.
      const incoming = ev.streams[0] ?? new MediaStream([ev.track]);
      console.info('[webrtc] ontrack', {
        peerId: this.peerId,
        kind: ev.track.kind,
        trackId: ev.track.id,
        streamId: incoming.id,
        muted: ev.track.muted,
        readyState: ev.track.readyState,
      });
      if (!this.remoteStream) {
        this.remoteStream = incoming;
        this.events.onRemoteStream?.(this.remoteStream);
      } else {
        for (const t of incoming.getTracks()) {
          this.remoteStream.addTrack(t);
        }
      }
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        console.info('[webrtc] local ICE candidate', {
          peerId: this.peerId,
          type: ev.candidate.type,
          protocol: ev.candidate.protocol,
          address: ev.candidate.address,
        });
        this.signaling.iceCandidate(this.peerId, ev.candidate.toJSON());
      } else {
        console.info('[webrtc] ICE gathering complete', { peerId: this.peerId });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.info('[webrtc] iceConnectionState ->', pc.iceConnectionState, { peerId: this.peerId });
    };

    pc.onconnectionstatechange = () => {
      console.info('[webrtc] connectionState ->', pc.connectionState, { peerId: this.peerId });
      this.events.onConnectionState?.(pc.connectionState);
      if (
        pc.connectionState === 'failed' ||
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'closed'
      ) {
        this.end(false);
      }
    };

    return pc;
  }

  /** Outbound: build an offer and send it to the peer. */
  async start() {
    console.info('[webrtc] start() outbound', { peerId: this.peerId });
    const pc = await this.setup();
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
    await pc.setLocalDescription(offer);
    console.info('[webrtc] offer created + setLocalDescription done — sending', { peerId: this.peerId });
    this.signaling.offer(this.peerId, offer);
  }

  /** Inbound: accept a received offer and send back an answer. */
  async accept(remoteOffer: RTCSessionDescriptionInit) {
    console.info('[webrtc] accept() inbound', { peerId: this.peerId });
    const pc = await this.setup();
    await pc.setRemoteDescription(remoteOffer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    console.info('[webrtc] answer created + setLocalDescription done — sending', { peerId: this.peerId });
    this.signaling.answer(this.peerId, answer);
  }

  async handleAnswer(sdp: RTCSessionDescriptionInit) {
    if (!this.pc) {
      console.warn('[webrtc] handleAnswer called but pc is null', { peerId: this.peerId });
      return;
    }
    console.info('[webrtc] applying remote answer', { peerId: this.peerId });
    await this.pc.setRemoteDescription(sdp);
  }

  async addIce(candidate: RTCIceCandidateInit) {
    if (!this.pc) return;
    try {
      await this.pc.addIceCandidate(candidate);
    } catch {
      // ignore late/duplicate candidates
    }
  }

  setMuted(muted: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  /** Local mic MediaStream (or null before setup). Useful for level meters. */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /** Underlying RTCPeerConnection (or null). Useful for stats / debugging. */
  getPeerConnection(): RTCPeerConnection | null {
    return this.pc;
  }

  /** Get current connection statistics for the quality indicator. */
  async getStats(): Promise<RTCStatsReport | null> {
    return this.pc?.getStats() ?? null;
  }

  /** Tear down. If notify=true, send hang-up to the peer. */
  end(notify = true) {
    if (this.ended) return;
    this.ended = true;
    if (notify) this.signaling.hangUp(this.peerId);
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.pc?.close();
    this.pc = null;
    this.events.onEnded?.();
  }
}

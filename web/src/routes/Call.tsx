import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { api, type User } from '../lib/api';
import { SignalingClient, type IncomingCall } from '../lib/signaling';
import { Call as RTCCall } from '../lib/webrtc';
import SpeakingIndicator from '../components/SpeakingIndicator';
import { registerStatsProvider } from '../lib/diagnostics';

type Phase =
  | { kind: 'idle' }
  | { kind: 'outgoing'; peer: User }
  | { kind: 'incoming'; from: string; name: string }
  | { kind: 'in-call'; peerId: string; peerName: string };

export default function Call() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [joinCode, setJoinCode] = useState('');
  const [online, setOnline] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [muted, setMuted] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [error, setError] = useState<string | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerSpeaking, setPeerSpeaking] = useState(false);
  const [youSpeaking, setYouSpeaking] = useState(false);

  const signalingRef = useRef<SignalingClient | null>(null);
  const callRef = useRef<RTCCall | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  // The signaling handlers are bound ONCE in the useEffect below (deps:
  // [token]). They cannot read the `phase` state directly without going
  // stale — by the time `onCallResponse` fires, the closure still sees the
  // initial `idle` phase. Mirror `phase` into a ref so handlers always read
  // the latest value.
  const phaseRef = useRef<Phase>({ kind: 'idle' });
  phaseRef.current = phase;

  const endCallLocal = useCallback((notify: boolean) => {
    callRef.current?.end(notify);
    callRef.current = null;
    pendingOfferRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setMuted(false);
    setConnectionState('new');
    setAutoplayBlocked(false);
    setRemoteStream(null);
    setLocalStream(null);
    setPhase({ kind: 'idle' });
  }, []);

  // Attach a remote MediaStream to the <audio> element and explicitly try to
  // play it. The browser's autoplay policy occasionally blocks playback even
  // after a user gesture (especially in iframes or after a slow connect); we
  // flip a flag so the UI can show a "tap to enable audio" button.
  const attachRemoteStream = useCallback((stream: MediaStream) => {
    const audio = remoteAudioRef.current;
    console.info('[Call] onRemoteStream', {
      tracks: stream.getTracks().map((t) => ({ kind: t.kind, id: t.id, muted: t.muted })),
      hasAudioEl: !!audio,
    });
    if (!audio) return;
    audio.srcObject = stream;
    audio.muted = false;
    audio.volume = 1;
    // Mirror the stream into React state so the SpeakingIndicator can
    // subscribe to it. Also remember our own mic stream so the "YOU"
    // indicator works.
    setRemoteStream(stream);
    setLocalStream(callRef.current?.getLocalStream() ?? null);
    audio.play().then(
      () => {
        console.info('[Call] remote audio playing');
        setAutoplayBlocked(false);
      },
      (err) => {
        console.warn('[Call] remote audio play() rejected:', err);
        setAutoplayBlocked(true);
      },
    );
  }, []);

  const unblockAudio = useCallback(() => {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    audio.muted = false;
    audio.play().then(
      () => setAutoplayBlocked(false),
      (err) => console.warn('[Call] retry play() failed:', err),
    );
  }, []);

  // Boot the signaling connection once we have a token.
  useEffect(() => {
    if (!token) return;
    const s = new SignalingClient(token, {
      onContactsUpdate: setOnline,
      onIncomingCall: (call: IncomingCall, from) => {
        setPhase({ kind: 'incoming', from, name: call.callerName });
        if (navigator.vibrate) navigator.vibrate([400, 200, 400]);
      },
      onCallResponse: (data, _from) => {
        // Read the LIVE phase via the ref — the closure-captured `phase`
        // would be stale (still 'idle' from when this handler was bound).
        const current = phaseRef.current;
        if (data.accepted) {
          if (current.kind === 'outgoing') {
            const call = new RTCCall(current.peer.id, s, {
              onRemoteStream: (stream) => attachRemoteStream(stream),
              onConnectionState: setConnectionState,
              onEnded: () => endCallLocal(false),
            });
            callRef.current = call;
            // Surface failures from call.start() — previously swallowed by
            // `void`, which is the most common reason "no audio" goes
            // undiagnosed (mic permission denied, codec mismatch, etc.).
            call.start().catch((err: unknown) => {
              console.error('[Call] call.start() failed', err);
              setError(`Call start failed: ${err instanceof Error ? err.message : String(err)}`);
              endCallLocal(false);
            });
            setPhase({ kind: 'in-call', peerId: current.peer.id, peerName: current.peer.username });
          }
        } else {
          setError('Call was declined.');
          endCallLocal(false);
        }
      },
      onCallFailed: ({ reason }) => {
        setError(reason || 'Call failed');
        endCallLocal(false);
      },
      onOffer: async (sdp, from) => {
        // Stash for acceptIncoming, then handle the common case where Bob
        // has ALREADY clicked Accept (created the RTCCall + set phase to
        // 'in-call') but the offer only just arrived from Alice. Without
        // this branch, Bob's RTCCall sits there with no remote description
        // and audio never flows.
        pendingOfferRef.current = sdp;
        const current = phaseRef.current;
        console.info('[Call] onOffer received', { from, phaseKind: current.kind });
        if (current.kind === 'in-call' && current.peerId === from && callRef.current) {
          try {
            await callRef.current.accept(sdp);
            pendingOfferRef.current = null;
          } catch (err) {
            console.error('[Call] inline accept(offer) failed', err);
            setError(`Could not start call: ${err instanceof Error ? err.message : String(err)}`);
            endCallLocal(false);
          }
        }
      },
      onAnswer: async (sdp, _from) => {
        await callRef.current?.handleAnswer(sdp);
      },
      onIceCandidate: async (candidate, _from) => {
        await callRef.current?.addIce(candidate);
      },
      onHangUp: () => endCallLocal(false),
      onError: setError,
    });
    signalingRef.current = s;
    s.connect();

    // Expose this page's RTCPeerConnection to window.voipStats() so DevTools
    // can read live byte counters / audio levels.
    const unregisterStats = registerStatsProvider(() => {
      const pc = callRef.current?.getPeerConnection();
      return pc ? [pc] : [];
    });

    return () => {
      unregisterStats();
      s.close();
      signalingRef.current = null;
      callRef.current?.end(false);
      callRef.current = null;
    };
    // Re-run when token changes, NOT when phase changes (closures intentionally capture latest via refs/setters).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Initial fetch of the online roster.
  useEffect(() => {
    if (!token) return;
    api.onlineUsers(token).then(setOnline).catch(() => {});
  }, [token]);

  const startOutbound = (target: User) => {
    setError(null);
    if (!signalingRef.current) return;
    setPhase({ kind: 'outgoing', peer: target });
    signalingRef.current.callRequest(target.id);
  };

  const cancelOutbound = () => {
    if (phase.kind === 'outgoing' && signalingRef.current) {
      signalingRef.current.hangUp(phase.peer.id);
    }
    endCallLocal(false);
  };

  const acceptIncoming = async () => {
    if (phase.kind !== 'incoming' || !signalingRef.current) return;
    const offer = pendingOfferRef.current;
    signalingRef.current.callResponse(phase.from, true);

    const call = new RTCCall(phase.from, signalingRef.current, {
      onRemoteStream: (stream) => attachRemoteStream(stream),
      onConnectionState: setConnectionState,
      onEnded: () => endCallLocal(false),
    });
    callRef.current = call;
    setPhase({ kind: 'in-call', peerId: phase.from, peerName: phase.name });

    if (offer) {
      try {
        await call.accept(offer);
        pendingOfferRef.current = null;
      } catch (err) {
        console.error('[Call] call.accept() failed', err);
        setError(`Could not accept call: ${err instanceof Error ? err.message : String(err)}`);
        endCallLocal(false);
      }
    }
  };

  const declineIncoming = () => {
    if (phase.kind !== 'incoming' || !signalingRef.current) return;
    signalingRef.current.callResponse(phase.from, false);
    endCallLocal(false);
  };

  const toggleMute = () => {
    const next = !muted;
    callRef.current?.setMuted(next);
    setMuted(next);
  };

  const filtered = online
    .filter((u) => u.id !== user?.id)
    .filter((u) => u.username.toLowerCase().includes(search.toLowerCase().trim()));

  return (
    <div className="pt-24 pb-16 min-h-[80vh] bg-gray-50">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="max-w-3xl mx-auto px-4 sm:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Calls</h1>
        <p className="mt-2 text-gray-600">
          Logged in as <span className="font-semibold">@{user?.username}</span>. Share your username
          with a friend so they can call you.
        </p>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        )}

        {/* Group room (Meet-like) — independent of the 1:1 flow below. */}
        {phase.kind === 'idle' && (
          <div className="mt-6 bg-gradient-to-br from-primary-50 to-white border border-primary-100 rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-900">Group room</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Spin up a multi-party voice room. Share the link, talk to up to ~5 people
                  at once. Audio is peer-to-peer over Opus.
                </p>
              </div>
              <Link
                to="/room"
                className="shrink-0 px-5 py-2.5 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 text-center"
              >
                Start a room
              </Link>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = joinCode.trim().toLowerCase();
                if (trimmed) navigate(`/room/${encodeURIComponent(trimmed)}`);
              }}
              className="mt-4 flex flex-col sm:flex-row gap-2"
            >
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="…or paste a room code, e.g. purple-fox-42"
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm"
              />
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="px-5 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Join room
              </button>
            </form>
          </div>
        )}

        {phase.kind === 'idle' && (
          <div className="mt-6 bg-white rounded-2xl shadow-soft p-4 sm:p-6">
            <h2 className="font-semibold text-gray-900">Who's online</h2>
            <input
              type="text"
              placeholder="Search by username"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-3 w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
            <ul className="mt-4 divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <li className="py-6 text-center text-gray-500 text-sm">
                  No one else is online right now. Open this page in another browser to test.
                </li>
              ) : (
                filtered.map((u) => (
                  <li key={u.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">@{u.username}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => startOutbound(u)}
                      className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
                    >
                      Call
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        <AnimatePresence>
          {phase.kind === 'outgoing' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6 bg-white rounded-2xl shadow-soft p-8 text-center"
            >
              <p className="text-sm uppercase tracking-wide text-primary-600 font-semibold">
                Calling…
              </p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900">@{phase.peer.username}</h2>
              <div className="mt-6 flex justify-center">
                <button
                  onClick={cancelOutbound}
                  className="px-6 py-3 rounded-full bg-red-500 text-white font-semibold hover:bg-red-600"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase.kind === 'incoming' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-gradient-to-br from-primary-600 to-secondary-500 flex items-center justify-center p-4"
            >
              <div className="text-white text-center">
                <p className="text-sm uppercase tracking-widest opacity-80">Incoming call</p>
                <h2 className="mt-4 text-4xl sm:text-5xl font-bold">@{phase.name}</h2>
                <div className="mt-12 flex justify-center space-x-6">
                  <button
                    onClick={declineIncoming}
                    className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-3xl"
                    aria-label="Decline"
                  >
                    ✕
                  </button>
                  <button
                    onClick={acceptIncoming}
                    className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-3xl"
                    aria-label="Accept"
                  >
                    ✓
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase.kind === 'in-call' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 bg-white rounded-2xl shadow-soft p-6 sm:p-8 text-center"
            >
              <p className="text-sm uppercase tracking-wide text-emerald-600 font-semibold">
                On a call with
              </p>

              {/* Peer avatar — glowing ring when they're speaking. */}
              <div className="mt-4 flex justify-center">
                <div
                  className={`relative w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 text-white flex items-center justify-center text-3xl font-bold transition-all duration-200 ${
                    peerSpeaking
                      ? 'ring-4 ring-emerald-400 ring-offset-4 ring-offset-white'
                      : 'ring-2 ring-gray-200 ring-offset-2 ring-offset-white'
                  }`}
                >
                  {phase.peerName.charAt(0).toUpperCase()}
                  {/* 3-bar speaking indicator badge in the bottom-right of the avatar. */}
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center border border-gray-100">
                    <SpeakingIndicator
                      stream={remoteStream}
                      onSpeakingChange={setPeerSpeaking}
                    />
                  </div>
                </div>
              </div>

              <h2 className="mt-3 text-2xl font-bold text-gray-900">@{phase.peerName}</h2>
              <p className="mt-1 text-sm text-gray-500">Status: {connectionState}</p>

              {/* Your own row — smaller, with its own indicator. */}
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
                <span>You</span>
                <SpeakingIndicator
                  stream={localStream}
                  onSpeakingChange={setYouSpeaking}
                />
                <span
                  className={`text-xs font-semibold transition-colors ${
                    youSpeaking ? 'text-primary-600' : 'text-gray-400'
                  }`}
                >
                  {muted ? 'muted' : youSpeaking ? 'talking' : 'quiet'}
                </span>
              </div>

              {autoplayBlocked && (
                <button
                  onClick={unblockAudio}
                  className="mt-4 px-4 py-2 rounded-lg bg-yellow-500 text-white text-sm font-semibold hover:bg-yellow-600"
                >
                  🔊 Tap to enable audio
                </button>
              )}

              <div className="mt-8 flex justify-center space-x-4">
                <button
                  onClick={toggleMute}
                  className={`px-6 py-3 rounded-full font-semibold ${
                    muted
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {muted ? 'Unmute' : 'Mute'}
                </button>
                <button
                  onClick={() => endCallLocal(true)}
                  className="px-6 py-3 rounded-full bg-red-500 text-white font-semibold hover:bg-red-600"
                >
                  Hang up
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

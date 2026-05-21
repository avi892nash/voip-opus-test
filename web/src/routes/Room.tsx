import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { SignalingClient } from '../lib/signaling';
import { RoomManager, type Participant } from '../lib/room';
import SpeakingIndicator from '../components/SpeakingIndicator';
import { registerStatsProvider } from '../lib/diagnostics';

/**
 * Multi-party voice room.
 *
 * URL shape:  /room/:code            join the room with this code
 *             /room                   create a new room and redirect to its code
 *
 * Mesh topology — every browser holds an RTCPeerConnection to every other
 * browser in the room. Audio packets flow peer-to-peer; the server only
 * relays the SDP/ICE handshake.
 */
export default function Room() {
  const { code: routeCode } = useParams<{ code?: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [code, setCode] = useState<string | null>(routeCode ?? null);
  const [phase, setPhase] = useState<'connecting' | 'in-room' | 'left' | 'error'>('connecting');
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  // If the browser refuses to autoplay any peer's audio, we collect the
  // pending <audio> elements here so a single user tap can replay all of them.
  const pendingAutoplayRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const signalingRef = useRef<SignalingClient | null>(null);
  const roomRef = useRef<RoomManager | null>(null);

  // Set up signaling + room manager once we have a token.
  useEffect(() => {
    if (!token || !user) return;

    const signaling = new SignalingClient(token, {});
    const room = new RoomManager(signaling, {
      onParticipantsChange: setParticipants,
      onJoined: (joinedCode) => {
        setCode(joinedCode);
        setPhase('in-room');
        // Make the mic stream available to SpeakingIndicator components.
        setLocalStream(room.getLocalStream());
        // Reflect the canonical code in the URL.
        if (joinedCode !== routeCode) {
          navigate(`/room/${joinedCode}`, { replace: true });
        }
      },
      onLeft: () => {
        setPhase('left');
      },
      onError: (reason) => {
        setError(reason);
        setPhase('error');
      },
    });
    room.bind();
    signalingRef.current = signaling;
    roomRef.current = room;

    signaling.connect();

    // Expose every peer's RTCPeerConnection to window.voipStats() for live
    // byte-counter / audio-level inspection from DevTools.
    const unregisterStats = registerStatsProvider(() => {
      const map = roomRef.current?.getPeerConnections();
      return map ? Array.from(map.values()) : [];
    });

    // Kick off either create or join based on the URL.
    (async () => {
      try {
        if (routeCode) {
          await room.joinByCode(routeCode);
        } else {
          await room.createAndJoin();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start audio');
        setPhase('error');
      }
    })();

    return () => {
      unregisterStats();
      try {
        room.leave();
      } catch {
        /* noop */
      }
      signaling.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    roomRef.current?.setMuted(next);
    setMuted(next);
  }, [muted]);

  // Called by a child <RemoteAudio> when its play() rejected. We record the
  // element so a single user tap can replay all pending audios at once.
  const handleAutoplayBlocked = useCallback(
    (peerId: string, audio: HTMLAudioElement) => {
      pendingAutoplayRef.current.set(peerId, audio);
      setAutoplayBlocked(true);
    },
    [],
  );

  const unblockAudio = useCallback(() => {
    const pending = pendingAutoplayRef.current;
    for (const [peerId, audio] of pending) {
      audio.muted = false;
      audio.play().then(
        () => pending.delete(peerId),
        (err) => console.warn('[Room] retry play() failed for', peerId, err),
      );
    }
    setAutoplayBlocked(false);
  }, []);

  const handleLeave = useCallback(() => {
    roomRef.current?.leave();
    navigate('/call');
  }, [navigate]);

  const copyInvite = useCallback(async () => {
    if (!code) return;
    const url = `${location.origin}/room/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard might be unavailable */
    }
  }, [code]);

  // Connection-state pill helper.
  const stateColor = (s: RTCPeerConnectionState | 'self') => {
    switch (s) {
      case 'self':
        return 'bg-primary-100 text-primary-700';
      case 'connected':
        return 'bg-emerald-100 text-emerald-700';
      case 'connecting':
      case 'new':
        return 'bg-amber-100 text-amber-700';
      case 'failed':
      case 'disconnected':
      case 'closed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="pt-24 pb-16 min-h-[80vh] bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-8">
        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <p className="text-primary-600 font-semibold uppercase tracking-wide text-xs sm:text-sm">
              Room
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900">
              {code ? code : 'Starting a room…'}
            </h1>
            {code && (
              <p className="mt-1 text-sm text-gray-600">
                Share the link to invite others. Audio is peer-to-peer over Opus.
              </p>
            )}
          </div>
          {code && phase === 'in-room' && (
            <button
              onClick={copyInvite}
              className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {copied ? '✓ Link copied' : 'Copy invite link'}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start justify-between gap-3">
            <span>{error}</span>
            <button
              onClick={() => navigate('/call')}
              className="text-red-700 hover:text-red-900 font-medium text-sm"
            >
              Back
            </button>
          </div>
        )}

        {phase === 'connecting' && (
          <div className="mt-10 text-center text-gray-500">
            Asking your browser for mic permission…
          </div>
        )}

        {phase === 'left' && (
          <div className="mt-10 text-center">
            <p className="text-gray-700">You've left the room.</p>
            <button
              onClick={() => navigate('/call')}
              className="mt-4 px-5 py-2.5 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700"
            >
              Back to Calls
            </button>
          </div>
        )}

        {phase === 'in-room' && (
          <>
            <div className="mt-6 bg-white rounded-2xl shadow-soft p-4 sm:p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold text-gray-900">
                  Participants ({participants.length})
                </h2>
                <span className="text-xs text-gray-500">
                  {participants.filter((p) => p.state === 'connected').length} of{' '}
                  {participants.length - 1} peers connected
                </span>
              </div>

              <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AnimatePresence>
                  {participants.map((p) => (
                    <motion.li
                      key={p.user.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50"
                    >
                      <ParticipantBody
                        participant={p}
                        stream={p.isSelf ? localStream : p.stream}
                        connectionState={stateColor}
                      />
                      {!p.isSelf && p.stream && (
                        <RemoteAudio
                          stream={p.stream}
                          peerId={p.user.id}
                          peerName={p.user.username}
                          onUnblockNeeded={handleAutoplayBlocked}
                        />
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              {participants.length <= 1 && (
                <p className="mt-4 text-sm text-gray-500 text-center">
                  Just you so far. Copy the invite link above to bring someone in.
                </p>
              )}
            </div>

            {autoplayBlocked && (
              <div className="mt-4 px-4 py-3 rounded-lg bg-yellow-50 border border-yellow-300 flex items-center justify-between">
                <span className="text-sm text-yellow-800">
                  Your browser blocked autoplay. Tap below to hear other participants.
                </span>
                <button
                  onClick={unblockAudio}
                  className="ml-3 px-3 py-1.5 rounded-md bg-yellow-500 text-white text-sm font-semibold hover:bg-yellow-600"
                >
                  🔊 Enable audio
                </button>
              </div>
            )}

            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={toggleMute}
                className={`px-6 py-3 rounded-full font-semibold transition-colors ${
                  muted
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {muted ? 'Unmute' : 'Mute'}
              </button>
              <button
                onClick={handleLeave}
                className="px-6 py-3 rounded-full bg-red-500 text-white font-semibold hover:bg-red-600"
              >
                Leave room
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Mount an <audio> element bound to a peer's remote stream so the browser
 * actually plays the audio.
 *
 * - We don't use `display:none` — some browsers refuse to play audio from a
 *   `display:none` element. An <audio> without `controls` is already zero
 *   pixels, so we just hide its (already-empty) chrome via aria attributes.
 * - Autoplay-policy: even after a user gesture, browsers occasionally reject
 *   play() (especially when the stream is attached asynchronously). The
 *   onUnblockNeeded prop lets the host page surface a "tap to enable audio"
 *   fallback button.
 */
/**
 * Body of a single participant tile. Owns its own `isSpeaking` state so the
 * avatar's ring only re-renders when the speaking state crosses the
 * threshold (driven by SpeakingIndicator's hysteretic detection).
 */
function ParticipantBody({
  participant,
  stream,
  connectionState,
}: {
  participant: Participant;
  stream: MediaStream | null;
  connectionState: (state: RTCPeerConnectionState | 'self') => string;
}) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 text-white flex items-center justify-center font-semibold flex-shrink-0 transition-all duration-200 ${
            isSpeaking
              ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-white'
              : 'ring-0'
          }`}
        >
          {participant.user.username.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate flex items-center gap-2">
            @{participant.user.username}
            {participant.isSelf && (
              <span className="text-xs text-gray-500 font-normal">(you)</span>
            )}
            <SpeakingIndicator stream={stream} onSpeakingChange={setIsSpeaking} />
          </div>
          <div className="text-xs text-gray-500 truncate">{participant.user.email}</div>
        </div>
      </div>
      <span
        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${connectionState(
          participant.isSelf ? 'self' : participant.state,
        )}`}
      >
        {participant.isSelf ? 'you' : participant.state}
      </span>
    </div>
  );
}

function RemoteAudio({
  stream,
  peerId,
  peerName,
  onUnblockNeeded,
}: {
  stream: MediaStream;
  peerId: string;
  peerName: string;
  onUnblockNeeded: (peerId: string, audio: HTMLAudioElement) => void;
}) {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const audio = ref.current;
    if (!audio || !stream) return;
    audio.srcObject = stream;
    audio.muted = false;
    audio.volume = 1;
    audio.play().then(
      () => console.info('[Room] remote audio playing', { peerName }),
      (err) => {
        console.warn('[Room] play() rejected for', peerName, err);
        onUnblockNeeded(peerId, audio);
      },
    );
  }, [stream, peerId, peerName, onUnblockNeeded]);
  return <audio ref={ref} autoPlay playsInline aria-hidden="true" />;
}

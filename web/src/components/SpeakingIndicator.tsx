import { useEffect, useRef, useState } from 'react';

/**
 * Broadcast-style voice level meter.
 *
 * Design lifted from Chris Wilson's "volume-meter" example
 * (https://github.com/cwilso/volume-meter) and OBS Studio's mic meter, with
 * a few simplifications appropriate for a "single bar next to a name" UI:
 *
 *   - Reads PCM via `AnalyserNode.getFloatTimeDomainData` (not byte data) so
 *     RMS is computed from real float samples, not quantized to 0–255.
 *   - Computes RMS over the buffer, converts to dB (`20·log10`).
 *   - Tracks a **peak with slow decay** ("peak hold"): the bar body shows
 *     current RMS, a thin marker rides on top showing recent peak. This is
 *     the convention every broadcast / DAW meter uses; it makes "spikes"
 *     visible that an RMS-only bar would smooth over.
 *   - Maps a configurable dB window to bar width. Default −50 dB → empty,
 *     −10 dB → full. Since the input is already log-scaled (dB), the bar
 *     responds perceptually-linearly to loudness.
 *   - Bar color is a 3-zone fixed mapping (green ≤−18 dB, yellow −18 to
 *     −6 dB, red >−6 dB) — also the broadcast convention. Color expresses
 *     "is this clipping?", which is the question the user wants answered;
 *     width expresses "how loud is it?".
 *   - Hysteretic "is speaking" detection: needs ~66 ms above threshold to
 *     turn on, ~500 ms of silence to turn off. The parent gets a single
 *     callback per transition (not per frame) so the avatar ring only
 *     re-renders when the speaking state actually flips.
 *
 * Performance: one AudioContext + one AnalyserNode + one rAF per indicator.
 * Cheap. For rooms beyond ~10 participants, switch to a shared context.
 */

const FFT_SIZE = 1024; // ~21 ms window at 48 kHz — fine for voice.
const FLOOR_DB = -50;
const CEIL_DB = -10;

// Zone boundaries for the color map (broadcast convention).
const YELLOW_DB = -18;
const RED_DB = -6;

const SPEAKING_THRESHOLD_DB = -35;
const FRAMES_TO_START = 4;
const FRAMES_TO_STOP = 30;

// Peak-hold decay, in dB per second. 18 dB/s is the IEC 60268-18 "Type I"
// rate — fast enough to track transients, slow enough that the marker is
// readable.
const PEAK_DECAY_DB_PER_SEC = 18;

interface Props {
  stream: MediaStream | null;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  /** Tailwind classes for the track (background). */
  trackClass?: string;
  className?: string;
}

function dbToLevel(db: number): number {
  return Math.max(0, Math.min(1, (db - FLOOR_DB) / (CEIL_DB - FLOOR_DB)));
}

function dbToColor(db: number): string {
  // Three-zone broadcast meter colors.
  if (db >= RED_DB) return '#ef4444'; // red-500
  if (db >= YELLOW_DB) return '#f59e0b'; // amber-500
  return '#10b981'; // emerald-500
}

export default function SpeakingIndicator({
  stream,
  onSpeakingChange,
  trackClass = 'bg-gray-200',
  className = '',
}: Props) {
  const fillRef = useRef<HTMLDivElement | null>(null);
  const peakRef = useRef<HTMLDivElement | null>(null);

  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  activeRef.current = active;

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      if (fillRef.current) fillRef.current.style.width = '0%';
      if (peakRef.current) peakRef.current.style.left = '0%';
      return;
    }

    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    void ctx.resume();

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    // We don't use smoothing on the analyser — we smooth in dB-space below,
    // which is more controllable and avoids the analyser's default 0.8
    // smoothing (which lags ~100ms behind real audio).
    analyser.smoothingTimeConstant = 0;
    source.connect(analyser);

    const buf = new Float32Array(analyser.fftSize);

    let raf = 0;
    let speakingFrames = 0;
    let silentFrames = 0;
    let peakDb = FLOOR_DB;
    let lastTickMs = performance.now();
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;

      const now = performance.now();
      const dtSec = (now - lastTickMs) / 1000;
      lastTickMs = now;

      analyser.getFloatTimeDomainData(buf);

      // RMS over the time-domain buffer.
      let sumSq = 0;
      for (let i = 0; i < buf.length; i++) {
        sumSq += buf[i] * buf[i];
      }
      const rms = Math.sqrt(sumSq / buf.length);
      const rmsDb = 20 * Math.log10(Math.max(rms, 1e-5));

      // Decay the held peak. New peak immediately if current RMS exceeds it.
      if (rmsDb > peakDb) {
        peakDb = rmsDb;
      } else {
        peakDb = Math.max(FLOOR_DB, peakDb - PEAK_DECAY_DB_PER_SEC * dtSec);
      }

      const rmsLevel = dbToLevel(rmsDb);
      const peakLevel = dbToLevel(peakDb);

      const fill = fillRef.current;
      if (fill) {
        fill.style.width = `${rmsLevel * 100}%`;
        fill.style.backgroundColor = dbToColor(rmsDb);
      }
      const peak = peakRef.current;
      if (peak) {
        peak.style.left = `${peakLevel * 100}%`;
        peak.style.backgroundColor = dbToColor(peakDb);
        peak.style.opacity = peakDb > FLOOR_DB + 1 ? '0.9' : '0';
      }

      // Hysteretic speaking detection on RMS dB.
      if (rmsDb > SPEAKING_THRESHOLD_DB) {
        speakingFrames++;
        silentFrames = 0;
        if (!activeRef.current && speakingFrames > FRAMES_TO_START) {
          setActive(true);
          onSpeakingChange?.(true);
        }
      } else {
        silentFrames++;
        speakingFrames = 0;
        if (activeRef.current && silentFrames > FRAMES_TO_STOP) {
          setActive(false);
          onSpeakingChange?.(false);
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      try {
        source.disconnect();
      } catch {
        /* ignore */
      }
      void ctx.close();
      if (activeRef.current) {
        onSpeakingChange?.(false);
        setActive(false);
      }
    };
    // onSpeakingChange intentionally excluded — closure stability not required.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  return (
    <div
      className={`relative inline-block h-1.5 w-16 rounded-full overflow-hidden ${trackClass} ${className}`}
      aria-label={active ? 'Speaking' : 'Silent'}
    >
      {/* Bar body — RMS, color-zoned green/yellow/red. */}
      <div
        ref={fillRef}
        className="absolute left-0 top-0 h-full rounded-full"
        style={{
          width: '0%',
          backgroundColor: '#10b981',
          transition: 'width 50ms linear',
        }}
      />
      {/* Peak-hold marker — thin vertical tick that decays slowly. */}
      <div
        ref={peakRef}
        className="absolute top-0 h-full w-[2px]"
        style={{
          left: '0%',
          backgroundColor: '#10b981',
          opacity: 0,
          transition: 'left 30ms linear, opacity 100ms ease-out',
        }}
      />
    </div>
  );
}

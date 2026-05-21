import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Section, { Aside, Cite } from './Section';

/**
 * Section 3 — Why we compress, and what "bitrate" means.
 *
 * Interactive: 5 buttons for 5 real Opus encodings of the same WAV at 6, 16,
 * 32, 64, 128 kbps. The user clicks one and the corresponding pre-encoded
 * file plays. We also show file size and savings vs the raw WAV.
 *
 * The point: at high bitrates Opus is indistinguishable from the original; at
 * low bitrates you can hear it making compromises — and the file shrinks a lot.
 */

interface Preset {
  kbps: number;
  href: string;
  label: string;
  note: string;
}

const PRESETS: Preset[] = [
  { kbps: 6, href: '/learn/sample-6k.opus', label: '6 kbps', note: 'Walkie-talkie territory' },
  { kbps: 16, href: '/learn/sample-16k.opus', label: '16 kbps', note: 'Recognizable but robotic' },
  { kbps: 32, href: '/learn/sample-32k.opus', label: '32 kbps', note: 'Phone-call quality' },
  { kbps: 64, href: '/learn/sample-64k.opus', label: '64 kbps', note: 'Better than a phone call' },
  { kbps: 128, href: '/learn/sample-128k.opus', label: '128 kbps', note: 'Effectively transparent' },
];

const RAW_HREF = '/learn/sample.wav';

export default function WhyCompress() {
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [playing, setPlaying] = useState<string | null>(null);
  const [decodeWarn, setDecodeWarn] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch each file once via HEAD so we get the exact byte size for the chart.
  useEffect(() => {
    let cancelled = false;
    const all = [RAW_HREF, ...PRESETS.map((p) => p.href)];
    Promise.all(
      all.map((u) =>
        fetch(u, { method: 'HEAD' }).then((r) => [u, Number(r.headers.get('Content-Length') ?? 0)] as const),
      ),
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<string, number> = {};
      for (const [u, n] of entries) next[u] = n;
      setSizes(next);
    });

    // Quick Opus support check — Safari/iOS fail here.
    const probe = document.createElement('audio');
    const ok = probe.canPlayType('audio/ogg; codecs=opus');
    if (!ok) {
      setDecodeWarn(
        'Your browser cannot play OGG-Opus directly (Safari/iOS is the usual culprit). Try this section in Chrome or Firefox.',
      );
    }
    return () => {
      cancelled = true;
    };
  }, []);

  function play(href: string) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const a = new Audio(href);
    audioRef.current = a;
    setPlaying(href);
    a.onended = () => {
      if (audioRef.current === a) {
        audioRef.current = null;
        setPlaying(null);
      }
    };
    a.onerror = () => {
      if (audioRef.current === a) {
        audioRef.current = null;
        setPlaying(null);
      }
      setDecodeWarn('That file would not play. Try a different browser if this keeps happening.');
    };
    void a.play();
  }

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(null);
  }

  useEffect(() => () => stop(), []);

  const rawSize = sizes[RAW_HREF] ?? 0;
  const maxSize = Math.max(rawSize, ...PRESETS.map((p) => sizes[p.href] ?? 0)) || 1;

  return (
    <Section
      id="compress"
      eyebrow="Step 2"
      title="Why we compress — and what bitrate really means"
      intro={
        <>
          <p>
            Section 1 left us with a problem: raw audio is huge. A codec is the program
            that fixes that. It throws away pieces of the audio your ears would barely
            miss, and writes the rest down in a much more compact form. Decoding reverses
            the trick.
          </p>
          <p>
            The single most important knob is <strong>bitrate</strong> — how many bits per
            second the codec is allowed to use. Higher bitrate = closer to the original =
            bigger file. Lower bitrate = smaller file, but the codec has to fudge more.
          </p>
          <p>
            Below is the same 11-second clip encoded by <Cite href="https://opus-codec.org/">Opus</Cite>{' '}
            at five different bitrates. The files are real and pre-shipped — click each and
            listen.
          </p>
        </>
      }
      tone="tinted"
    >
      <div className="rounded-2xl border border-gray-200 bg-white shadow-soft p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900">Listen at different bitrates</h3>
        <p className="mt-1 text-sm text-gray-600">
          Start at the bottom (transparent quality) and work down. Notice when the artifacts
          first start being audible — somewhere around 16 kbps for most ears.
        </p>

        {decodeWarn && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
            {decodeWarn}
          </div>
        )}

        <div className="mt-4 space-y-2">
          <BitrateRow
            label="Raw WAV (no compression)"
            sublabel="48 kHz, 16-bit, mono — what the mic actually captured"
            size={rawSize}
            maxSize={maxSize}
            playingHref={playing}
            href={RAW_HREF}
            kbps={48000 * 16 / 1000}
            onPlay={() => play(RAW_HREF)}
            onStop={stop}
            isReference
          />
          {PRESETS.map((p) => (
            <BitrateRow
              key={p.kbps}
              label={p.label}
              sublabel={p.note}
              size={sizes[p.href] ?? 0}
              maxSize={maxSize}
              playingHref={playing}
              href={p.href}
              kbps={p.kbps}
              onPlay={() => play(p.href)}
              onStop={stop}
              savedVsRaw={rawSize ? 1 - (sizes[p.href] ?? 0) / rawSize : 0}
            />
          ))}
        </div>

        <div className="mt-5 text-sm text-gray-600 leading-relaxed">
          Opus at 64 kbps is roughly{' '}
          <strong>
            {rawSize && sizes['/learn/sample-64k.opus']
              ? Math.round(rawSize / sizes['/learn/sample-64k.opus'])
              : '?'}
            ×
          </strong>{' '}
          smaller than the raw WAV, and most people can't reliably tell them apart in a
          listening test. That ratio is why we can have voice calls on cellular data at all.
        </div>
      </div>

      <Aside>
        <strong>Lossy vs lossless.</strong> Opus is a <em>lossy</em> codec — bits are
        permanently thrown away in exchange for size. There are lossless codecs too (FLAC
        for music, the never-throws-away cousin of MP3), but lossless can only shrink
        audio by 2–3×. For voice over a network, the trade-off Opus makes is worth it.
        Background reading:{' '}
        <Cite href="https://datatracker.ietf.org/doc/html/rfc6716">RFC 6716 §2</Cite>.
      </Aside>
    </Section>
  );
}

interface RowProps {
  label: string;
  sublabel: string;
  size: number;
  maxSize: number;
  playingHref: string | null;
  href: string;
  kbps: number;
  onPlay: () => void;
  onStop: () => void;
  isReference?: boolean;
  savedVsRaw?: number;
}

function BitrateRow({
  label,
  sublabel,
  size,
  maxSize,
  playingHref,
  href,
  kbps,
  onPlay,
  onStop,
  isReference = false,
  savedVsRaw = 0,
}: RowProps) {
  const isPlaying = playingHref === href;
  const fillPct = maxSize > 0 ? Math.max(2, (size / maxSize) * 100) : 0;
  const sizeKB = size / 1024;
  return (
    <div className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={isPlaying ? onStop : onPlay}
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-colors ${
            isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-600 hover:bg-primary-700'
          }`}
          aria-label={isPlaying ? `Stop ${label}` : `Play ${label}`}
        >
          {isPlaying ? '■' : '▶'}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`font-semibold ${isReference ? 'text-gray-900' : 'text-gray-900'}`}>
              {label}
            </span>
            <span className="text-xs text-gray-500 font-mono">
              {kbps.toLocaleString()} kbps
            </span>
          </div>
          <div className="text-xs text-gray-500 truncate">{sublabel}</div>
          <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className={`h-full ${isReference ? 'bg-gray-400' : 'bg-primary-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${fillPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-gray-500">
            <span className="font-mono">{sizeKB ? `${sizeKB.toFixed(1)} KB` : '—'}</span>
            {!isReference && savedVsRaw > 0 && (
              <span className="font-mono text-primary-700">
                {(savedVsRaw * 100).toFixed(1)}% smaller than raw
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

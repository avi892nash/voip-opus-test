import { useState } from 'react';
import { motion } from 'framer-motion';
import Section, { Aside, Cite } from './Section';

/**
 * Section 4 — How Opus actually works.
 *
 * Two interactive bits:
 *  1. A "mode picker" — choose Speech / Music / Mixed and see which sub-codec
 *     Opus would route the audio through (SILK / CELT / Hybrid).
 *  2. A frame-size slider — show how Opus chops audio into chunks, with the
 *     real latency / efficiency tradeoff written out.
 */

const FRAME_SIZES_MS = [2.5, 5, 10, 20, 40, 60];

type Mode = 'speech' | 'music' | 'mixed';

const MODES: Record<Mode, { title: string; pipeline: string; explanation: string; chip: string }> = {
  speech: {
    title: 'Pure speech',
    pipeline: 'SILK only',
    chip: 'Voice call, podcast, audiobook',
    explanation:
      'SILK was designed by Skype for voice. It models the human vocal tract using linear predictive coding (LPC) — basically, it predicts the next sample from the previous ones and only sends what it got wrong. Very efficient for speech down to ~6 kbps.',
  },
  music: {
    title: 'Pure music',
    pipeline: 'CELT only',
    chip: 'Song, instrumental, ambient',
    explanation:
      'CELT was designed by Xiph for low-latency music. It transforms each frame into the frequency domain using an MDCT and quantizes the spectral coefficients. Great for music at ~32 kbps+, and small frame sizes keep the delay low.',
  },
  mixed: {
    title: 'Mixed signal',
    pipeline: 'Hybrid (SILK + CELT)',
    chip: 'Music behind a voice, sung speech',
    explanation:
      'Hybrid mode runs SILK on the lower frequencies (where speech lives) and CELT on the higher frequencies (where most of the music sparkle lives). Opus stitches them together. This is unique to Opus — no other codec does it.',
  },
};

export default function InsideOpus() {
  const [mode, setMode] = useState<Mode>('speech');
  const [frameIdx, setFrameIdx] = useState(3); // default 20 ms
  const frameMs = FRAME_SIZES_MS[frameIdx];

  const m = MODES[mode];

  // Visual: show how audio gets chopped into chunks at this frame size.
  // We render N frames where N = how many fit in a 120 ms preview window.
  const previewMs = 120;
  const frames = Math.max(1, Math.round(previewMs / frameMs));
  const cellWidthPct = 100 / frames;

  // Latency / efficiency commentary derived from the slider.
  let latencyNote: string;
  if (frameMs <= 5) {
    latencyNote = 'Lowest delay — best for music interaction and live performance. Bits-per-frame is small so overhead is higher; need slightly more bitrate for the same quality.';
  } else if (frameMs <= 20) {
    latencyNote = 'The default sweet spot. Used by WebRTC, Discord, Zoom — round-trip stays inside the ~150 ms window before humans notice delay.';
  } else {
    latencyNote = 'More efficient at low bitrates because there\'s more audio to find patterns in — but you wait longer for each frame, which hurts conversations.';
  }

  return (
    <Section
      id="inside"
      eyebrow="Step 3"
      title="Inside Opus: two codecs in a trench coat"
      intro={
        <>
          <p>
            Most codecs are good at exactly one kind of audio. <Cite href="https://en.wikipedia.org/wiki/MP3">MP3</Cite>{' '}
            is built for music; the old <Cite href="https://datatracker.ietf.org/doc/html/rfc3551">G.711</Cite> phone
            codec is built for speech. Opus refused to pick.
          </p>
          <p>
            Opus is actually <strong>two codecs glued together</strong>:
            {' '}
            <strong>SILK</strong> (Skype's speech codec) handles voices well at low
            bitrates; <strong>CELT</strong> (Xiph's music codec) handles everything else,
            with very low delay. For each chunk of audio, Opus decides on the fly which
            one to use — or runs both in parallel in a hybrid mode unique to it.
          </p>
        </>
      }
      tone="light"
    >
      {/* MODE PICKER */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-soft p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900">What's in the audio?</h3>
        <p className="mt-1 text-sm text-gray-600">
          Pick a signal type. Opus would route it through different internal pipelines.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {(Object.keys(MODES) as Mode[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setMode(k)}
              className={`px-3 py-3 rounded-lg text-sm font-medium border transition-colors text-center ${
                mode === k
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {MODES[k].title}
            </button>
          ))}
        </div>

        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-5"
        >
          <Pipeline mode={mode} />
          <div className="mt-4">
            <span className="inline-block px-2 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold">
              {m.chip}
            </span>
            <p className="mt-3 text-sm text-gray-700 leading-relaxed">{m.explanation}</p>
          </div>
        </motion.div>
      </div>

      {/* FRAME-SIZE SLIDER */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-soft p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900">Frame size — the delay knob</h3>
        <p className="mt-1 text-sm text-gray-600">
          Opus doesn't encode samples one at a time. It groups them into <strong>frames</strong>{' '}
          and encodes a whole frame at once. The frame size sets how often packets fly out — and
          how long the person on the other end has to wait.
        </p>

        <div className="mt-4 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={FRAME_SIZES_MS.length - 1}
            step={1}
            value={frameIdx}
            onChange={(e) => setFrameIdx(Number(e.target.value))}
            className="flex-1 slider"
            aria-label="Frame size"
          />
          <span className="font-mono text-sm text-primary-700 font-semibold w-20 text-right">
            {frameMs} ms
          </span>
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-gray-500 font-mono px-1">
          {FRAME_SIZES_MS.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>

        <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 p-3">
          <div className="text-xs text-gray-500 mb-1.5">
            120 ms of audio at this frame size → {frames} {frames === 1 ? 'frame' : 'frames'}:
          </div>
          <div className="flex h-10 rounded overflow-hidden border border-gray-200">
            {Array.from({ length: frames }).map((_, i) => (
              <motion.div
                key={`${frameMs}-${i}`}
                className="border-r border-white/60 last:border-r-0"
                style={{
                  width: `${cellWidthPct}%`,
                  background: `hsl(${220 + (i * 360) / frames}, 80%, ${55 + (i % 2) * 6}%)`,
                }}
                initial={{ scaleY: 0.6, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ delay: i * 0.02, duration: 0.15 }}
              />
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-600">{latencyNote}</div>
        </div>

        <Aside>
          <strong>Why 20 ms is the default.</strong> Humans notice voice delays above
          roughly 150–200 ms (you start talking over each other on a bad video call). Of
          that budget, you have to pay encoding + network + decoding + audio output. A
          20 ms frame leaves room for everything else. Opus's frame-size flexibility is
          spelled out in{' '}
          <Cite href="https://datatracker.ietf.org/doc/html/rfc6716#section-2.1.4">
            RFC 6716 §2.1.4
          </Cite>
          .
        </Aside>
      </div>
    </Section>
  );
}

function Pipeline({ mode }: { mode: Mode }) {
  // Simple SVG showing audio entering and choosing one of three paths.
  return (
    <svg viewBox="0 0 540 230" className="w-full h-auto" role="img" aria-label="Opus internal pipeline">
      {/* Input node */}
      <g>
        <rect x="10" y="78" width="86" height="44" rx="8" fill="#1f2937" />
        <text x="53" y="105" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="600">
          Audio in
        </text>
      </g>
      <line x1="96" y1="100" x2="160" y2="100" stroke="#94a3b8" strokeWidth="2" />

      {/* Three pipelines */}
      <Path y={36} active={mode === 'music'} label="CELT" sub="MDCT → quantize" color="#8b5cf6" />
      <Path y={100} active={mode === 'mixed'} label="Hybrid" sub="SILK low band + CELT high band" color="#0ea5e9" />
      <Path y={164} active={mode === 'speech'} label="SILK" sub="LPC → predict + residual" color="#10b981" />

      {/* Decision node */}
      <g>
        <circle cx="170" cy="100" r="14" fill="#2563eb" />
        <text x="170" y="105" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">
          ?
        </text>
      </g>
      <line x1="170" y1="86" x2="170" y2="50" stroke="#94a3b8" strokeWidth="2" />
      <line x1="170" y1="114" x2="170" y2="150" stroke="#94a3b8" strokeWidth="2" />

      {/* Output */}
      <g>
        <rect x="440" y="78" width="86" height="44" rx="8" fill="#1f2937" />
        <text x="483" y="98" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">
          OGG-Opus
        </text>
        <text x="483" y="113" textAnchor="middle" fill="#cbd5e1" fontSize="10">
          packets
        </text>
      </g>
    </svg>
  );
}

function Path({
  y,
  active,
  label,
  sub,
  color,
}: {
  y: number;
  active: boolean;
  label: string;
  sub: string;
  color: string;
}) {
  const op = active ? 1 : 0.25;
  const stroke = active ? color : '#cbd5e1';
  return (
    <g opacity={op}>
      <line x1="184" y1={y + 14} x2="350" y2={y + 14} stroke={stroke} strokeWidth={active ? 2.5 : 1.5} />
      <line x1="350" y1={y + 14} x2="440" y2={100} stroke={stroke} strokeWidth={active ? 2.5 : 1.5} />
      <rect x="200" y={y} width="140" height="28" rx="6" fill={active ? color : '#e5e7eb'} />
      <text x="270" y={y + 18} textAnchor="middle" fill={active ? 'white' : '#374151'} fontSize="12" fontWeight="700">
        {label}
      </text>
      <text x="270" y={y + 38} textAnchor="middle" fill={active ? color : '#9ca3af'} fontSize="10" fontWeight="600">
        {sub}
      </text>
    </g>
  );
}

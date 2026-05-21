import { motion } from 'framer-motion';

/**
 * Section 1 — The Hook.
 * One-shot animated journey showing voice → numbers → packets → network → ear.
 * Pure SVG + Framer Motion; no audio, no interaction.
 */
export default function HookHero() {
  return (
    <section className="pt-24 sm:pt-28 pb-16 bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-8">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-primary-600 font-semibold uppercase tracking-wide text-xs sm:text-sm"
        >
          Tutorial
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight"
        >
          How does a voice call actually work?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-4 text-gray-700 text-base sm:text-lg leading-relaxed"
        >
          When you talk on Discord, FaceTime, or WhatsApp, your voice gets chopped into
          numbers, squeezed by a codec called <strong>Opus</strong>, packed into tiny
          envelopes, shot across maybe several countries, unpacked at the other end, and
          turned back into sound — all in less time than a single blink. This tutorial
          walks through every step, with things you can play with as you go.
        </motion.p>

        <Journey />
      </div>
    </section>
  );
}

function Journey() {
  // A simple horizontal stage with 5 beats. Each beat fades in in sequence,
  // and a wave/packet animates between them.
  const stops = [
    { label: 'You speak', icon: '🗣️' },
    { label: 'Mic samples it', icon: '🎙️' },
    { label: 'Opus compresses it', icon: '🗜️' },
    { label: 'Network ships it', icon: '🌐' },
    { label: 'They hear it', icon: '👂' },
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="mt-10 sm:mt-14 bg-white rounded-2xl border border-gray-200 shadow-soft p-4 sm:p-6"
    >
      <div className="relative">
        <div className="grid grid-cols-5 gap-2 sm:gap-4">
          {stops.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.18, duration: 0.4 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-lg sm:text-2xl">
                {s.icon}
              </div>
              <div className="mt-2 text-[10px] sm:text-xs font-medium text-gray-700 leading-tight">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
        {/* Moving dot that travels across the journey */}
        <svg
          aria-hidden
          viewBox="0 0 500 40"
          className="absolute left-0 right-0 top-5 sm:top-7 -z-0 pointer-events-none"
        >
          <line x1="50" y1="20" x2="450" y2="20" stroke="#dbeafe" strokeWidth="2" />
          <motion.circle
            r="4"
            fill="#2563eb"
            initial={{ cx: 50 }}
            animate={{ cx: [50, 150, 250, 350, 450, 50] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
            cy="20"
          />
        </svg>
      </div>
      <p className="mt-6 text-xs sm:text-sm text-gray-500 text-center">
        The whole trip usually takes under 200 milliseconds.
      </p>
    </motion.div>
  );
}

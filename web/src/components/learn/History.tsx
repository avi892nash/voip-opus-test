import { motion } from 'framer-motion';
import Section, { Cite } from './Section';

/**
 * Section 5 — How Opus came to exist.
 *
 * No interaction. A scrollable timeline with citations to RFCs, IETF charters,
 * and Xiph announcements. Tells the story of why a unified open codec was needed.
 */

interface Beat {
  year: string;
  title: string;
  body: React.ReactNode;
  source?: { label: string; href: string };
}

const BEATS: Beat[] = [
  {
    year: '2003',
    title: 'Skype launches with a proprietary codec',
    body: (
      <>
        Skype's voice calls sound great, but they're a walled garden — only Skype clients
        can talk to other Skype clients. The web has no shared, high-quality voice codec.
        Every app rolls its own, badly.
      </>
    ),
  },
  {
    year: '2007',
    title: 'Xiph starts work on CELT',
    body: (
      <>
        The non-profit behind Vorbis and FLAC starts a new codec aimed at music with very
        low latency, called <strong>CELT</strong> — Constrained-Energy Lapped Transform.
        Designed to be open and royalty-free from day one.
      </>
    ),
    source: {
      label: 'Xiph CELT project',
      href: 'https://www.xiph.org/celt/',
    },
  },
  {
    year: '2009',
    title: 'Skype open-sources SILK',
    body: (
      <>
        Skype publishes <strong>SILK</strong>, the speech codec it's been quietly using in
        its own client, and submits it to the IETF for standardization. Great at speech,
        not great at music — perfectly complementary to CELT.
      </>
    ),
    source: {
      label: 'SILK Internet-Draft',
      href: 'https://datatracker.ietf.org/doc/html/draft-vos-silk-02',
    },
  },
  {
    year: '2010',
    title: 'The IETF Codec Working Group merges them',
    body: (
      <>
        The newly chartered IETF <Cite href="https://datatracker.ietf.org/wg/codec/charter/">codec working group</Cite>{' '}
        decides not to pick a winner. Instead it produces a hybrid: SILK at low bitrates
        for speech, CELT at higher bitrates for music, switchable in real time. The result
        is called <strong>Opus</strong>.
      </>
    ),
  },
  {
    year: 'September 2012',
    title: 'Opus is standardized as RFC 6716',
    body: (
      <>
        After two years of tuning and listening tests, the IETF publishes Opus as a
        proposed standard. Royalty-free, BSD-licensed reference implementation, available
        to anyone.
      </>
    ),
    source: {
      label: 'RFC 6716',
      href: 'https://datatracker.ietf.org/doc/html/rfc6716',
    },
  },
  {
    year: '2013–2017',
    title: 'WebRTC mandates Opus',
    body: (
      <>
        The W3C bakes Opus into <Cite href="https://www.w3.org/TR/webrtc/">WebRTC</Cite>{' '}
        as a mandatory-to-implement codec — every browser that does real-time voice has to
        speak it. Discord, Zoom, FaceTime audio, WhatsApp, and Google Meet all adopt it.
      </>
    ),
  },
  {
    year: 'Today',
    title: 'Everywhere',
    body: (
      <>
        Opus is the default voice codec on the public internet. ChatGPT's voice mode runs
        on it. Bluetooth's new <Cite href="https://www.bluetooth.com/specifications/specs/low-complexity-communication-codec/">LC3</Cite>{' '}
        codec borrows ideas from it. In just over a decade, an experimental hybrid became
        the single most-used voice codec on the planet.
      </>
    ),
  },
];

export default function History() {
  return (
    <Section
      id="history"
      eyebrow="Step 4"
      title="A short history of Opus"
      intro={
        <>
          <p>
            Opus didn't exist twelve years ago. The internet had real-time voice — but every
            app spoke its own private dialect, and the open codecs that did exist were either
            too slow for conversation or too bad for music. Here's how that got fixed.
          </p>
        </>
      }
      tone="tinted"
    >
      <ol className="relative border-l-2 border-primary-200 pl-6 ml-2 space-y-8">
        {BEATS.map((b, i) => (
          <motion.li
            key={b.year}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="relative"
          >
            <div className="absolute -left-[34px] top-1 w-5 h-5 rounded-full bg-primary-600 ring-4 ring-white shadow-sm" />
            <div className="text-xs font-mono uppercase tracking-wide text-primary-700 font-semibold">
              {b.year}
            </div>
            <h3 className="mt-1 text-lg font-bold text-gray-900">{b.title}</h3>
            <p className="mt-2 text-gray-700 leading-relaxed">{b.body}</p>
            {b.source && (
              <p className="mt-2 text-sm">
                <Cite href={b.source.href}>↗ {b.source.label}</Cite>
              </p>
            )}
          </motion.li>
        ))}
      </ol>
    </Section>
  );
}

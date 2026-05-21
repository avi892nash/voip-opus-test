import { Link } from 'react-router-dom';
import Section, { Cite } from './Section';

interface Challenge {
  title: string;
  body: React.ReactNode;
  cite?: { label: string; href: string };
}

const CHALLENGES: Challenge[] = [
  {
    title: 'Latency: every millisecond hurts',
    body: (
      <>
        Above roughly 150 ms of round-trip delay, you start stepping on each other's
        sentences. That budget has to cover encoding, packetizing, network hops, jitter
        buffering, decoding, and audio output. Opus's tiny frame sizes (down to 2.5 ms)
        exist for exactly this reason.
      </>
    ),
  },
  {
    title: 'Packet loss: networks drop bits',
    body: (
      <>
        Real networks lose 1–5% of packets even on a good day. A naive codec would
        produce audible glitches. Opus has built-in <strong>Forward Error Correction</strong>{' '}
        — each packet can carry a low-bitrate copy of the previous one, so a single dropped
        packet is recoverable without retransmission.
      </>
    ),
    cite: {
      label: 'Opus FEC details',
      href: 'https://datatracker.ietf.org/doc/html/rfc6716#section-2.1.7',
    },
  },
  {
    title: 'NAT: your computer has no public address',
    body: (
      <>
        Your laptop's IP is something like <code className="font-mono text-xs bg-gray-100 px-1 rounded">192.168.1.42</code> —
        invisible from the public internet. To make a peer-to-peer call, both sides have to
        discover their public addresses (<Cite href="https://datatracker.ietf.org/doc/html/rfc8489">STUN</Cite>),
        relay through a server when direct connection fails (<Cite href="https://datatracker.ietf.org/doc/html/rfc8656">TURN</Cite>),
        and negotiate the working path (<Cite href="https://datatracker.ietf.org/doc/html/rfc8445">ICE</Cite>).
      </>
    ),
  },
  {
    title: 'Privacy: no one should listen in',
    body: (
      <>
        Once two peers connect, the audio is encrypted with{' '}
        <Cite href="https://datatracker.ietf.org/doc/html/rfc3711">SRTP</Cite>. The
        signaling server (the one we built for the next page) only sees who is talking to
        whom and helps them find each other. It never sees a single byte of sound.
      </>
    ),
  },
];

export default function WhatsHard() {
  return (
    <Section
      id="hard"
      eyebrow="Step 6"
      title="The rest of the iceberg"
      intro={
        <>
          <p>
            Opus is one piece of a working voice call — arguably the cleverest piece, but
            far from the only one. Here's what else has to be solved.
          </p>
        </>
      }
      tone="tinted"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CHALLENGES.map((c) => (
          <div key={c.title} className="rounded-2xl bg-white border border-gray-200 p-5 shadow-soft">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">{c.title}</h3>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">{c.body}</p>
            {c.cite && (
              <p className="mt-2 text-xs">
                <Cite href={c.cite.href}>↗ {c.cite.label}</Cite>
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl bg-gradient-to-br from-primary-600 to-secondary-500 text-white p-6 sm:p-8 text-center">
        <h3 className="text-xl sm:text-2xl font-bold">Ready to make a real call?</h3>
        <p className="mt-2 text-white/90 max-w-xl mx-auto">
          Sign up, share your username with a friend, and make a real WebRTC voice call —
          using everything you just learned.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/signup"
            className="px-6 py-3 rounded-lg bg-white text-primary-700 font-semibold hover:bg-gray-100 transition-colors"
          >
            Create an account
          </Link>
          <Link
            to="/call"
            className="px-6 py-3 rounded-lg bg-white/10 border border-white/30 text-white font-semibold hover:bg-white/20 transition-colors"
          >
            Already have one — open the call page
          </Link>
        </div>
      </div>
    </Section>
  );
}

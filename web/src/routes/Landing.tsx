import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import HeroAnimation from '../components/HeroAnimation';
import { useAuth } from '../lib/auth';

const cards = [
  {
    to: '/learn',
    title: 'Learn',
    body: 'How VoIP works end-to-end, and why the Opus codec is the de-facto standard for real-time voice on the web.',
    cta: 'Read the explainer →',
    accent: 'from-sky-500 to-blue-600',
  },
  {
    to: '/demo',
    title: 'Test',
    body: 'Record yourself, encode through Opus in the browser, and compare original vs compressed with live waveform and spectrum.',
    cta: 'Try the demo →',
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    to: '/call',
    title: 'Call',
    body: 'Sign up, share a username with a friend, and make a real WebRTC voice call — powered by Opus, encrypted in transit.',
    cta: 'Start a call →',
    accent: 'from-fuchsia-500 to-violet-600',
  },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <>
      <section className="pt-28 sm:pt-36 pb-16 bg-gradient-to-br from-primary-600 via-primary-500 to-secondary-500 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              VoIP, Opus, and a working voice-call app — in one place.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-white/90 max-w-xl">
              An interactive guide to internet voice calls. Read how it works, play with the
              compression knobs, and then make a real call.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to="/learn"
                className="px-6 py-3 rounded-xl bg-white text-primary-600 font-semibold hover:bg-gray-50 transition-colors text-center"
              >
                Start learning
              </Link>
              <Link
                to={user ? '/call' : '/signup'}
                className="px-6 py-3 rounded-xl bg-white/10 border border-white/30 text-white font-semibold hover:bg-white/20 transition-colors text-center"
              >
                {user ? 'Make a call' : 'Sign up to call'}
              </Link>
            </div>
          </motion.div>
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <HeroAnimation />
          </motion.div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
            Three ways to dive in
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((c, i) => (
              <motion.div
                key={c.to}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to={c.to}
                  className="block bg-white rounded-2xl p-6 shadow-soft hover:shadow-medium transition-shadow h-full"
                >
                  <div
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${c.accent} mb-4`}
                  >
                    {c.title}
                  </div>
                  <p className="text-gray-700 leading-relaxed">{c.body}</p>
                  <p className="mt-4 text-primary-600 font-semibold text-sm">{c.cta}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

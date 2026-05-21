import { Link } from 'react-router-dom';
import Section from './Section';

export default function TryYourself() {
  return (
    <Section
      id="try"
      eyebrow="Step 5"
      title="Play with the real thing"
      intro={
        <>
          <p>
            You've now seen what Opus does and roughly how. The next page hands you the
            controls: record your own voice, dial the bitrate up and down, and watch the
            file size and waveform change in real time.
          </p>
        </>
      }
      tone="light"
    >
      <div className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-6 sm:p-8 text-center">
        <p className="text-base sm:text-lg text-gray-700">
          The encoder is the real <code className="px-1 py-0.5 rounded bg-gray-100 text-sm">libopus</code>{' '}
          compiled to WebAssembly, running entirely in your browser. Nothing leaves your device.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/demo"
            className="px-6 py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
          >
            Open the interactive demo →
          </Link>
        </div>
      </div>
    </Section>
  );
}

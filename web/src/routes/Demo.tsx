import InteractiveDemo from '../components/InteractiveDemo';

export default function Demo() {
  return (
    <div className="pt-24">
      <section className="py-12 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
          <p className="text-primary-600 font-semibold uppercase tracking-wide text-sm">Demo</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
            Record yourself. Hear the Opus version.
          </h1>
          <p className="mt-4 text-gray-600 leading-relaxed">
            Grant microphone access, record a short clip, and the browser will encode it through the
            Opus codec right here on your device. Compare the raw and compressed audio side by side
            and watch the bitrate / quality trade-off in real time.
          </p>
        </div>
      </section>
      <InteractiveDemo />
    </div>
  );
}

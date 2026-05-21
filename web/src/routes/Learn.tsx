import HookHero from '../components/learn/HookHero';
import WhatIsSound from '../components/learn/WhatIsSound';
import WhyCompress from '../components/learn/WhyCompress';
import InsideOpus from '../components/learn/InsideOpus';
import History from '../components/learn/History';
import TryYourself from '../components/learn/TryYourself';
import WhatsHard from '../components/learn/WhatsHard';

/**
 * The Learn page is a single-scroll tutorial laid out as a series of self-
 * contained sections. Each section either contains its own interactive widget
 * or links forward to the /demo or /call pages where the interaction lives.
 */
export default function Learn() {
  return (
    <div>
      <HookHero />
      <WhatIsSound />
      <WhyCompress />
      <InsideOpus />
      <History />
      <TryYourself />
      <WhatsHard />
    </div>
  );
}

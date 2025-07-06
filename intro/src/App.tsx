import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import AudioBasics from './components/AudioBasics';
import OpusCodec from './components/OpusCodec';
import InteractiveDemo from './components/InteractiveDemo';
import Footer from './components/Footer';

function App() {
  return (
    <div className="App">
      <Navbar />
      <main>
        <Hero />
        <AudioBasics />
        <OpusCodec />
        <InteractiveDemo />
      </main>
      <Footer />
    </div>
  );
}

export default App;

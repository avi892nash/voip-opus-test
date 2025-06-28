import React from 'react';
import { motion } from 'framer-motion';

const AudioBasics: React.FC = () => {
  return (
    <section id="basics" className="section">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          What is Audio Compression?
        </motion.h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mt-8">
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Why Do We Need Audio Compression?</h3>
            <p className="text-lg text-gray-600 mb-8">
              Raw audio files are huge! A 3-minute song in WAV format can be 30MB, but the same song compressed with Opus might be only 3MB with nearly identical quality.
            </p>
            
            <div className="bg-gray-50 p-8 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <h4 className="text-gray-800 mb-4 font-medium">
                    Uncompressed<br/>(WAV)
                  </h4>
                  <div className="text-3xl font-bold text-primary-500 mb-2">30 MB</div>
                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
                    High Quality
                  </div>
                </div>
                <div className="text-3xl text-primary-500 font-bold mx-8">→</div>
                <div className="text-center flex-1">
                  <h4 className="text-gray-800 mb-4 font-medium">
                    Compressed<br/>(Opus)
                  </h4>
                  <div className="text-3xl font-bold text-primary-500 mb-2">3 MB</div>
                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
                    High Quality
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="flex justify-center items-center"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <div className="bg-gray-50 p-12 rounded-2xl border-2 border-dashed border-gray-300 min-h-[200px] flex items-center justify-center w-full">
              <div className="text-center text-primary-500">
                <h4 className="mb-4 text-primary-500 text-xl font-semibold">Compression Animation</h4>
                <p className="text-gray-500">Visual comparison coming soon...</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AudioBasics; 
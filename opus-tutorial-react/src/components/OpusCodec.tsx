import React from 'react';
import { motion } from 'framer-motion';

const OpusCodec: React.FC = () => {
  const steps = [
    { number: 1, title: 'Audio Input', description: 'Raw audio waveform is captured' },
    { number: 2, title: 'Frame Splitting', description: 'Audio is divided into small frames' },
    { number: 3, title: 'Encoding', description: 'Each frame is compressed using CELT + SILK' },
    { number: 4, title: 'Output', description: 'Compressed data is ready for transmission' },
  ];

  return (
    <section id="opus" className="section">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          How Does Opus Work?
        </motion.h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:-translate-y-2"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
            >
              <div className="w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
                {step.number}
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{step.title}</h3>
              <p className="text-gray-600 mb-4">{step.description}</p>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-primary-500 text-sm font-medium">
                  Step {step.number} Animation
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OpusCodec; 
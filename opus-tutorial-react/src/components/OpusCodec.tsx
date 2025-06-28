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
        
        <div className="opus-process">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              className="process-step"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
            >
              <div className="step-number">{step.number}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <div className="step-animation">
                <div style={{ color: '#667eea', fontSize: '0.9rem' }}>
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
import React from 'react';
import { motion } from 'framer-motion';

const InteractiveDemo: React.FC = () => {
  return (
    <section id="demo" className="section">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          Interactive Opus Demo
        </motion.h2>
        
        <motion.div 
          className="demo-container"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <h3>Interactive Demo Coming Soon!</h3>
            <p>Upload audio files, adjust parameters, and see real-time compression in action.</p>
            <div style={{ marginTop: '2rem' }}>
              <button className="btn btn-primary">Try Demo</button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default InteractiveDemo; 
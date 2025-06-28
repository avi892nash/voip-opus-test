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
          className="bg-gray-50 rounded-2xl p-12 text-center max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">Interactive Demo Coming Soon!</h3>
          <p className="text-lg text-gray-600 mb-8">
            Upload audio files, adjust parameters, and see real-time compression in action.
          </p>
          <button className="btn btn-primary">Try Demo</button>
        </motion.div>
      </div>
    </section>
  );
};

export default InteractiveDemo; 
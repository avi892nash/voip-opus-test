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
        
        <div className="content-grid">
          <motion.div 
            className="text-content"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3>Why Do We Need Audio Compression?</h3>
            <p>Raw audio files are huge! A 3-minute song in WAV format can be 30MB, but the same song compressed with Opus might be only 3MB with nearly identical quality.</p>
            
            <div className="comparison-card">
              <div className="comparison-item">
                <h4>Uncompressed (WAV)</h4>
                <div className="file-size">30 MB</div>
                <div className="quality-indicator high">High Quality</div>
              </div>
              <div className="arrow">→</div>
              <div className="comparison-item">
                <h4>Compressed (Opus)</h4>
                <div className="file-size">3 MB</div>
                <div className="quality-indicator high">High Quality</div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="visual-content"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <div className="animation-container">
              <div style={{ textAlign: 'center', color: '#667eea', fontSize: '1.2rem' }}>
                Compression Animation
                <br />
                <small>Visual comparison coming soon...</small>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AudioBasics; 
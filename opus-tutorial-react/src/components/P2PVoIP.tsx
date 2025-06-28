import React from 'react';
import { motion } from 'framer-motion';

const P2PVoIP: React.FC = () => {
  return (
    <section id="p2p" className="section">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          Peer-to-Peer IPv6 VoIP
        </motion.h2>
        
        <motion.div 
          className="p2p-content"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div className="p2p-explanation">
            <h3>Direct Connection Without Servers</h3>
            <p>Learn how to build a VoIP application that connects two devices directly using IPv6, eliminating the need for central servers.</p>
            
            <div className="p2p-architecture">
              <div className="device device-1">
                <div className="device-icon">📱</div>
                <div className="device-label">Device A</div>
              </div>
              <div className="connection-line">
                <div className="connection-animation"></div>
              </div>
              <div className="device device-2">
                <div className="device-icon">💻</div>
                <div className="device-label">Device B</div>
              </div>
            </div>
          </div>
          
          <div className="p2p-demo">
            <div className="demo-card">
              <h4>Try the P2P VoIP App</h4>
              <p>Download and test the peer-to-peer voice calling application</p>
              <button className="btn btn-primary">Download App</button>
              <button className="btn btn-secondary">View Source Code</button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default P2PVoIP; 
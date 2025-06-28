import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Opus Codec Tutorial</h3>
            <p>Learn audio compression through interactive visualizations</p>
          </div>
          <div className="footer-section">
            <h4>Resources</h4>
            <ul>
              <li><a href="https://opus-codec.org/">Opus Official Site</a></li>
              <li><a href="https://tools.ietf.org/html/rfc6716">RFC 6716</a></li>
              <li><a href="https://github.com/xiph/opus">Opus Source</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Project</h4>
            <ul>
              <li><a href="https://github.com/your-repo">GitHub</a></li>
              <li><a href="#demo">Interactive Demo</a></li>
              <li><a href="#p2p">P2P VoIP App</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 Opus Codec Tutorial. Built for educational purposes.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 
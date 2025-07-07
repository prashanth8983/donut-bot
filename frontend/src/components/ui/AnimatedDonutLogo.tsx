import React from 'react';
import { motion } from 'framer-motion';

const AnimatedDonutLogo: React.FC<{ size?: number; className?: string }> = ({ size = 48, className = '' }) => (
  <motion.div
    className={`relative inline-block ${className}`}
    style={{ width: size, height: size }}
    animate={{ y: [0, -4, 0], scale: [1, 1.05, 1] }}
    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
  >
    <motion.div
      className="w-full h-full rounded-full bg-gradient-to-br from-pink-500 to-purple-600 shadow-xl flex items-center justify-center"
      animate={{ boxShadow: [
        '0 0 12px 2px rgba(236,72,153,0.25)',
        '0 0 20px 4px rgba(168,85,247,0.35)',
        '0 0 12px 2px rgba(236,72,153,0.25)'
      ] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: size * 0.5, height: size * 0.5 }}>
        <div className="w-full h-full bg-slate-900 rounded-full shadow-inner" />
      </div>
    </motion.div>
  </motion.div>
);

export default AnimatedDonutLogo; 
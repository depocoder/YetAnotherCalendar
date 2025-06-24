import React from 'react';
import { motion } from 'framer-motion';

const dotStyle = {
  width: '6px',
  height: '6px',
  backgroundColor: 'currentColor', 
  borderRadius: '50%',
  margin: '0 2px',
};

const transition = {
  duration: 0.4,
  repeat: Infinity,
  repeatType: 'reverse',
  ease: 'easeInOut',
};

const dotVariants = {
  start: { y: '0%' },
  end: { y: '60%' },
};

const InlineLoader = () => (
  <div
    className="inline-loader"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '14px', 
    }}
  >
    {[...Array(3)].map((_, i) => (
      <motion.span
        key={i}
        style={dotStyle}
        variants={dotVariants}
        initial="start"
        animate="end"
        transition={{ ...transition, delay: i * 0.1 }}
      />
    ))}
  </div>
);

export default InlineLoader;

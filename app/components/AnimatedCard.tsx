// AnimatedCard.tsx
"use client";

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils'; // Assuming you have a cn utility

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({ children, className }) => {
  return (
    <motion.div
      className={cn(
        "relative rounded-xl overflow-hidden",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.6,
        ease: [0.19, 1.0, 0.22, 1.0] // Exponential ease out for smoother animation
      }}
      whileHover={{ 
        boxShadow: "0 10px 30px -10px rgba(144, 97, 249, 0.4)",
        transition: { duration: 0.2 }
      }}
    >
      {/* Moving border effect */}
      <div className="absolute inset-0 p-[1px] rounded-xl overflow-hidden z-0">
        <div className="absolute inset-0">
          <div className="absolute inset-[-200%] animate-[spin_8s_linear_infinite]">
            {/* Gradient mesh that rotates */}
            <div className="w-[400%] h-[400%] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(168,85,247,0.7)_360deg)]" />
          </div>
        </div>
      </div>
      
      {/* Card background with small gap to show border */}
      <div className="absolute inset-[1px] bg-black/70 backdrop-blur-lg rounded-[calc(0.75rem-1px)] z-10" />
      
      {/* Content */}
      <div className="relative z-20">
        {children}
      </div>
    </motion.div>
  );
};

export default AnimatedCard;
// GalaxyBackground.tsx
"use client";

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  pulseSpeed: number;
  hue: number;
  hueChange: number;
}

const GalaxyBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animationFrameId = useRef<number>(0);
  const mousePosition = useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas to full screen
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Recreate particles when resizing
      initParticles();
    };
    
    // Track mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      mousePosition.current = {
        x: e.clientX,
        y: e.clientY
      };
    };
    
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    resizeCanvas();
    
    // Initialize particles
    function initParticles() {
      particles.current = [];
      const particleCount = Math.min(200, Math.floor(window.innerWidth * window.innerHeight / 8000));
      
      for (let i = 0; i < particleCount; i++) {
        particles.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.3,
          opacity: Math.random() * 0.5 + 0.3,
          pulseSpeed: Math.random() * 0.01 + 0.005,
          hue: Math.random() * 60 + 240, // Blues to purples (240-300)
          hueChange: (Math.random() - 0.5) * 0.5
        });
      }
    }
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw mouse-based glow effect
      const gradient = ctx.createRadialGradient(
        mousePosition.current.x, 
        mousePosition.current.y, 
        0, 
        mousePosition.current.x, 
        mousePosition.current.y, 
        200
      );
      gradient.addColorStop(0, 'rgba(128, 90, 213, 0.3)');
      gradient.addColorStop(0.2, 'rgba(128, 90, 213, 0.1)');
      gradient.addColorStop(1, 'rgba(128, 90, 213, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      particles.current.forEach((particle, index) => {
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        // Pulse opacity
        particle.opacity += Math.sin(Date.now() * particle.pulseSpeed) * 0.01;
        particle.opacity = Math.max(0.2, Math.min(0.8, particle.opacity));
        
        // Update color hue
        particle.hue += particle.hueChange;
        if (particle.hue > 300) particle.hue = 240;
        if (particle.hue < 240) particle.hue = 300;
        
        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
        
        // Calculate distance from mouse
        const dx = mousePosition.current.x - particle.x;
        const dy = mousePosition.current.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Slightly attract particles to mouse
        if (distance < 300) {
          const forceFactor = (1 - distance / 300) * 0.02;
          particle.speedX += dx * forceFactor / distance;
          particle.speedY += dy * forceFactor / distance;
          
          // Limit speed
          const speed = Math.sqrt(particle.speedX * particle.speedX + particle.speedY * particle.speedY);
          if (speed > 1.5) {
            particle.speedX = (particle.speedX / speed) * 1.5;
            particle.speedY = (particle.speedY / speed) * 1.5;
          }
        }
        
        // Draw particle with color
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        
        // Use HSL for nice color variation
        const color = `hsla(${particle.hue}, 70%, 80%, ${particle.opacity})`;
        ctx.fillStyle = color;
        ctx.fill();
        
        // Add subtle glow effect
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue}, 70%, 70%, ${particle.opacity * 0.3})`;
        ctx.fill();
        
        // Draw connections between nearby particles
        for (let j = index + 1; j < particles.current.length; j++) {
          const p2 = particles.current[j];
          const dx = particle.x - p2.x;
          const dy = particle.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(p2.x, p2.y);
            
            // Gradient line based on both particles' colors
            const gradient = ctx.createLinearGradient(particle.x, particle.y, p2.x, p2.y);
            gradient.addColorStop(0, `hsla(${particle.hue}, 70%, 80%, ${(1 - distance / 100) * 0.2 * particle.opacity})`);
            gradient.addColorStop(1, `hsla(${p2.hue}, 70%, 80%, ${(1 - distance / 100) * 0.2 * p2.opacity})`);
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });
      
      animationFrameId.current = requestAnimationFrame(animate);
    };
    
    initParticles();
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, []);
  
  return (
    <>
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 z-0 pointer-events-none"
      />
      <div className="fixed inset-0 z-0 pointer-events-none">
        <motion.div 
          className="absolute inset-0 bg-gradient-radial from-purple-900/30 via-transparent to-transparent"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 8,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />
        <motion.div 
          className="absolute inset-0 bg-gradient-radial from-purple-600/20 via-blue-900/10 to-transparent"
          style={{ transformOrigin: '70% 30%' }}
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{
            duration: 12,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />
      </div>
    </>
  );
};

export default GalaxyBackground;
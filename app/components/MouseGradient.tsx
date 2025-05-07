import React, { useEffect } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

const MouseGradient = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);
  
  const gradientX = useTransform(mouseX, (val) => val / 5);
  const gradientY = useTransform(mouseY, (val) => val / 5);
  
  return (
    <motion.div 
      className="fixed pointer-events-none w-[500px] h-[500px] rounded-full opacity-20 blur-[80px] z-0"
      style={{
        background: "radial-gradient(circle, rgba(59,130,246,0.8) 0%, rgba(147,51,234,0.3) 70%, rgba(0,0,0,0) 100%)",
        x: gradientX,
        y: gradientY,
        translateX: "-50%",
        translateY: "-50%"
      }}
    />
  );
};

export default MouseGradient;

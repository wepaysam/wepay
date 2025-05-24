"use client";

import React, { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import logo from "../../Assets/logo.png";
import hero from "../../Assets/hero.png";

interface HeroSectionProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  imageUrl?: string;
}

const Logo = () => (
  <div className="flex items-center ml-10 mb-4">
    <Image src={logo} alt="wepay logo" width={200} height={200} />
    {/* <span className="ml-2 text-2xl font-semibold">WePay</span> */}
  </div>
);

const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  subtitle,
  ctaText,
  ctaLink,
  // imageUrl,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const elements = containerRef.current.querySelectorAll('.reveal');
      const windowHeight = window.innerHeight;
  
      elements.forEach(element => {
        const rect = (element as HTMLElement).getBoundingClientRect();
        const revealPoint = 150;
  
        if (rect.top < windowHeight - revealPoint) {
          element.classList.add('active');
        }
      });
    };
  
    window.addEventListener('scroll', handleScroll);
    // Trigger once on mount
    handleScroll();
  
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#0f172a] py-20 md:py-32" ref={containerRef}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] to-[#1e293b] opacity-80" />
      
      {/* Content container */}
      <div className="container relative z-10 mx-auto px-4 sm:px-6">
        <div className="grid items-center gap-12 md:grid-cols-2">
          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Logo />
            <motion.h1
              className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {title}
            </motion.h1>
            
            <motion.p
              className="mt-4 max-w-lg text-xl text-gray-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {subtitle}
            </motion.p>
            
            <div className="flex space-x-4 m-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Link
                  href={ctaLink}
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md font-medium text-white bg-primary hover:bg-primary/90 transition-colors duration-200 gap-2"
                >
                  {ctaText}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Link
                  href="/Auth/login"
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md font-medium text-white bg-primary hover:bg-primary/90 transition-colors duration-200 gap-2"
                >
                  Login
                </Link>
              </motion.div>
            </div>
          </motion.div>
          
          {/* Image or graphic */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileInView={{ y: [0, -20, 0], opacity: [0, 1, 1] }}
            viewport={{ once: true }}
            className="reveal-right relative z-10 hidden md:block"
          >
            <div style={{ transform: 'scale(1.5)', transformOrigin: 'center center' }}>
              <Image 
                src={hero} 
                alt="Hero illustration" 
                width={600} 
                height={400} 
                className="w-full h-auto max-w-[120%]" 
                priority
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
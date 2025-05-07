
import React from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";

interface LogoProps {
  className?: string;
  textClassName?: string;
  dark?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className, textClassName, dark = false }) => {
  return (
    <div className={cn("flex items-center", className)}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative mr-2"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center overflow-hidden">
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
            className="w-6 h-6 bg-white/20 backdrop-blur-sm rounded-full absolute"
          ></motion.div>
          <div className="w-4 h-4 bg-gradient-to-br from-blue-300 to-cyan-400 rounded-full absolute right-1"></div>
        </div>
      </motion.div>
      <motion.span
        initial={{ x: -10, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className={cn(
          "text-xl font-semibold tracking-tight",
          dark ? "text-white" : "text-slate-800",
          textClassName
        )}
      >
        WePay
      </motion.span>
    </div>
  );
};

export default Logo;

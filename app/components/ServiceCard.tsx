import React from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface ServiceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color?: string;
  onClick?: () => void;
  delay?: number;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  title,
  description,
  icon: Icon,
  color = "primary",
  onClick,
  delay = 0,
}) => {
  return (
    <motion.div
      className="group relative overflow-hidden rounded-xl bg-[#1e293b] border border-gray-800 p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-primary/50"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      onClick={onClick}
      whileHover={{
        boxShadow: "0 20px 25px -5px rgba(59, 130, 246, 0.1), 0 10px 10px -5px rgba(59, 130, 246, 0.04)",
      }}
    >
      {/* Gradient background that appears on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-blue-500/5 to-purple-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      {/* Icon container */}
      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-${color}/10 text-${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      
      {/* Content */}
      <h3 className="mb-2 text-xl font-semibold text-white">{title}</h3>
      <p className="text-gray-300">{description}</p>
      
      {/* Arrow indicator that appears on hover */}
      <div className="mt-4 flex items-center text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="text-sm font-medium">Learn more</span>
        <svg
          className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
      </div>
    </motion.div>
  );
};

export default ServiceCard;

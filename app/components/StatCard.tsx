
import React from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  description?: string;
  icon?: React.ReactNode;
  actionButton?: React.ReactNode; // New prop for action button
  variant?: "default" | "outline" | "glass";
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  description,
  icon,
  actionButton, // Add actionButton here
  variant = "default",
  className,
}) => {
  const isPositiveChange = change && change > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "p-5 rounded-xl overflow-hidden",
        variant === "outline" && "border border-border",
        variant === "glass" && "glass-morphism",
        variant === "default" && "bg-card",
        className
      )}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl font-bold mb-1">{value}</h3>

          {change !== undefined && (
            <div className="flex items-center text-xs">
              <span
                className={cn(
                  "flex items-center",
                  isPositiveChange ? "text-green-500" : "text-red-500"
                )}
              >
                {isPositiveChange ? (
                  <ArrowUp className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(change)}%
              </span>
              <span className="text-muted-foreground ml-1">vs last period</span>
            </div>
          )}

          {description && (
            <p className="text-xs text-muted-foreground mt-2">{description}</p>
          )}
        </div>

        {(icon || actionButton) && (
          <div className="flex items-center gap-2"> {/* Use flex to align icon and button */}
            {icon && (
              <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
            )}
            {actionButton}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StatCard;

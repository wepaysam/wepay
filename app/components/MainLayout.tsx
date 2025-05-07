"use client";

import React, { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { useIsMobile } from "../hooks/use-mobile";
import { AnimatePresence, motion } from "framer-motion";
import ThemeToggle from "./ThemeToggle";

interface MainLayoutProps {
  children: ReactNode;
  location: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, location }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex w-full dark:w-full min-h-screen bg-background dark:bg-background-dark">
      <Sidebar open={sidebarOpen || !isMobile}  />
      
      <main className={`flex-1 overflow-auto min-h-screen transition-all duration-300 ${sidebarOpen || !isMobile ? "ml-64" : "ml-0"}`}>
        <header className="flex justify-end p-4">
          <ThemeToggle />
        </header>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="container mx-auto py-6 px-4 sm:px-6"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default MainLayout;
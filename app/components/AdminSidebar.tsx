"use client";
import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";


interface AdminSidebarProps {
  open: boolean;
  toggleSidebar: () => void;
}

import { 
  Home, 
  Users, 
  CreditCard, 
  FileText, 
  LogOut,
  Settings,
  Receipt,
  Shield,
  Landmark
} from "lucide-react";
import { cn } from "../lib/utils";
import Cookies from "js-cookie";
import Image from "next/image";
import logo from "../../Assets/logo.png";
import { AnimatePresence, motion } from "framer-motion";

const Logo = () => (
  <Link href="/admin" className="flex items-center gap-2">
    <Image src={logo} alt="Logo" width={32} height={32} />
    <span className="font-bold text-lg">WePay Admin</span>
  </Link>
);

interface AdminSidebarProps {
  open: boolean;
  toggleSidebar: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ open, toggleSidebar }) => {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/admin", icon: <Home />, label: "Dashboard" },
    { href: "/admin/unverified-users", icon: <Users />, label: "Unverified Users" },
    { href: "/admin/verified-users", icon: <Users />, label: "Verified Users" },
    { href: "/admin/balance-requests", icon: <CreditCard />, label: "Balance Requests" },
    { href: "/admin/banking", icon: <Landmark />, label: "Banking" },
    { href: "/admin/transactions", icon: <FileText />, label: "Transactions" },
    { href: "/admin/transaction-charges", icon: <Receipt />, label: "Transaction Charges" },
    { href: "/admin/settings", icon: <Settings />, label: "Settings" },
  ];

  const handleLogout = () => {
    // Remove the JWT token using document.cookie
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    
    // Redirect to login page
    router.push('/Auth/login');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 h-screen w-64 bg-background dark:bg-background-dark border-r dark:border-r-dark flex flex-col z-50"
        >
          <div className="p-4 border-b flex items-center">
            <Shield className="text-primary mr-2" size={24} />
            <Logo />
          </div>
          <nav className="flex-1 p-2 overflow-y-auto">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 p-3 rounded-lg mb-1 hover:bg-accent transition-colors ${
                  pathname === link.href ? 'bg-accent text-primary font-medium' : 'text-muted-foreground'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
          
          {/* Logout button */}
          <div className="p-4 border-t mt-auto">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 p-2 w-full rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdminSidebar;

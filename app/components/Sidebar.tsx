import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  ArrowLeftRight, 
  FileText, 
  Users, 
  Gift, 
  Receipt, 
  Link as LinkIcon, 
  DollarSign, 
  BarChart, 
  Settings,
  Menu,
  X,
  LogOut
} from "lucide-react";
import Image from "next/image";
import logo from "../../Assets/logo.png";

const Logo = () => (
  <Link href="/" className="flex items-center gap-2">
    <Image src={logo} alt="Logo" width={140} height={140} />
    {/* <span className="font-bold text-lg">WePay</span> */}
  </Link>
);

interface SidebarProps {
  open: boolean;
}
const Sidebar: React.FC<SidebarProps> = () => {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/", icon: <Home />, label: "Home" },
    { href: "/payouts", icon: <ArrowLeftRight />, label: "Payouts" },
    { href: "/statement", icon: <Receipt />, label: "Statement" },
    { href: "/balancerequest", icon: <FileText />, label: "Balance Request" },
    // { href: "/account-statement", icon: <FileText />, label: "Account Statement" },
    // { href: "/contacts", icon: <Users />, label: "Contacts" },
    { href: "/recharge", icon: <Gift />, label: "Gift Cards" },
    // { href: "/tax-payments", icon: <Receipt />, label: "Tax Payments" },
    // { href: "/payout-links", icon: <LinkIcon />, label: "Payout Links" },
    // { href: "/payroll", icon: <DollarSign />, label: "Payroll" },
    // { href: "/reports", icon: <BarChart />, label: "Reports" },
    { href: "/settings", icon: <Settings />, label: "Settings" },
  ];

  const handleLogout = () => {
    // Remove the JWT token using document.cookie
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    
    // Redirect to login page
    router.push('/Auth/login');
    
    // Optional: Show toast notification
    // toast({ title: "Logged out", description: "You have been successfully logged out" });
  };

  return (
    <div className="fixed top-0 left-0 h-screen w-64 bg-background dark:bg-background-dark border-r dark:border-r-dark flex flex-col shadow-2xl shadow-gray-800 dark:shadow-white">
      <div className="h-24 border-b flex items-center justify-center flex-shrink-0">
        <Logo />
      </div>
      <nav className="flex-1 p-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-2 p-2 rounded-lg hover:bg-accent ${pathname === link.href ? 'bg-accent' : ''}`}
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
    </div>
  );
};

export default Sidebar;

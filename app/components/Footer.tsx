import Link from "next/link";
import Image from "next/image";
import logo from "../../Assets/logo.png";
import { Facebook, Twitter, Instagram, Linkedin, Youtube, MapPin, Mail, Phone } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Link href="/" className="text-gray-300 flex items-center hover:text-white transition-colors">
                <Image src={logo} alt="WePay Logo" width={40} height={40} />
                <span className="ml-2 text-xl font-semibold">WePay</span>
              </Link>
            </div>
            <p className="text-gray-400 mb-4">
              WePay is a modern digital banking and payment platform for businesses.
              It offers a unified dashboard for managing accounts, payments, and more.
              Your security is our top priority with advanced encryption and fraud protection.
              We ensure seamless transactions while maintaining the highest security standards.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Youtube size={20} />
              </a>
            </div>
          </div>

          {/* Contact Us */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <MapPin size={16} className="text-gray-400 mt-1 flex-shrink-0" />
                <p className="text-gray-400 text-sm">
                  Shop no 12, Second Floor, Lata Circle,<br />
                  Apna Bazar, Jhotwara, Jaipur,<br />
                  Rajasthan 302013
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Mail size={16} className="text-gray-400" />
                <div className="text-gray-400 text-sm">
                  <a href="mailto:vishubh043@gmail.com" className="hover:text-white transition-colors">
                    vishubh043@gmail.com
                  </a>
                  <br />
                  <a href="mailto:support@wepay.in" className="hover:text-white transition-colors">
                    support@wepay.in
                  </a>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Phone size={16} className="text-gray-400" />
                <a href="tel:9001770984" className="text-gray-400 text-sm hover:text-white transition-colors">
                  +91 9001770984
                </a>
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Products</h3>
            <ul className="space-y-2">
              <li className="text-gray-400 hover:text-white transition-colors cursor-pointer">Payouts</li>
              <li className="text-gray-400 hover:text-white transition-colors cursor-pointer">Collections</li>
              <li className="text-gray-400 hover:text-white transition-colors cursor-pointer">Card</li>
              <li className="text-gray-400 hover:text-white transition-colors cursor-pointer">Insurance</li>
              <li className="text-gray-400 hover:text-white transition-colors cursor-pointer">Loans</li>
            </ul>
          </div>

          {/* Company */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li><Link href="/aboutus" className="text-gray-400 hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contactUs" className="text-gray-400 hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        <hr className="border-gray-800 my-8" />

        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            © 2025 WePay Pvt Limited. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            <Link href="/aboutus" className="hover:text-white transition-colors">Privacy Policy</Link>
          </div>
        </div>
        
        <div className="mt-6 text-xs text-gray-500 text-center">
          WePay is not a bank but a technology platform for digital financial services, advisory in partnership with RBI licensed Banks and IRDAI licensed insurers. All funds in the customer&apos;s bank account are insured as per the guidelines of RBI.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
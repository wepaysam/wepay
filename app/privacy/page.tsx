import React from 'react';
import MainLayout from '../components/MainLayout';
import Footer from '../components/Footer';
// import { useRouter } from 'next/router';
import Link from "next/link";

const Privacy = () => {
  // const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto py-12 px-4">
        <Link
          href="/"
          className="mb-8 text-gray-300 hover:text-white transition-colors"
        >
          ← Back
        </Link>
        
        <h1 className="text-4xl font-bold mb-8 text-center text-white animate-fade-in">Privacy Policy</h1>
        
        <div className="prose max-w-none bg-gray-800 p-8 rounded-lg shadow-lg text-gray-300">
          <p className="text-gray-400">Last updated: March 20, 2025</p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-4 text-white animate-slide-in-left">1. Introduction</h2>
          <p className="text-gray-300">
            WePay Pvt Limited &quot;we&quot; &quot;our&quot; &quot;us&quot; is committed to protecting your privacy. This Privacy Policy explains how your personal information is collected, used, and disclosed by WePay.
          </p>
          <p className="text-gray-300">
            This Privacy Policy applies to our website, and its associated subdomains (collectively, our &quot;Service&quot;). By accessing or using our Service, you signify that you have read, understood, and agree to our collection, storage, use, and disclosure of your personal information as described in this Privacy Policy and our Terms of Service.
          </p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-4 text-white animate-slide-in-left">2. Information We Collect</h2>
          <p className="text-gray-300">
            We collect information from you when you visit our website, register on our site, place an order, subscribe to our newsletter, respond to a survey, fill out a form, or use our services.
          </p>
          <h3 className="text-xl font-semibold mt-4 mb-2 text-white animate-slide-in-left">2.1 Personal Data</h3>
          <p className="text-gray-300">
            While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you (&quot;Personal Data&quot;). Personally identifiable information may include, but is not limited to:
          </p>
          <ul className="list-disc pl-8 space-y-2 text-gray-300 animate-fade-in">
            <li>Email address</li>
            <li>First name and last name</li>
            <li>Phone number</li>
            <li>Address, State, Province, ZIP/Postal code, City</li>
            <li>Cookies and Usage Data</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-6 mb-4 text-white animate-slide-in-left">3. How We Use Your Information</h2>
          <p className="text-gray-300">
            We use the information we collect in various ways, including to:
          </p>
          <ul className="list-disc pl-8 space-y-2 text-gray-300 animate-fade-in">
            <li>Provide, operate, and maintain our website</li>
            <li>Improve, personalize, and expand our website</li>
            <li>Understand and analyze how you use our website</li>
            <li>Develop new products, services, features, and functionality</li>
            <li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the website, and for marketing and promotional purposes</li>
            <li>Send you emails</li>
            <li>Find and prevent fraud</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-6 mb-4 text-white animate-slide-in-left">4. Security of Your Personal Information</h2>
          <p className="text-gray-300">
            We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
          </p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-4 text-white animate-slide-in-left">5. Contact Us</h2>
          <p className="text-gray-300">
            If you have any questions about this Privacy Policy, please contact us at privacy@wepay.com.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Privacy;

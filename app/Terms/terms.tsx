import React from 'react';
import MainLayout from '../components/MainLayout';
import Footer from '../components/Footer';
// import { useRouter } from 'next/router';
import Link from "next/link";

const Terms = () => {
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
        
        <h1 className="text-4xl font-bold mb-8 text-center text-white animate-fade-in">Terms & Conditions</h1>
        
        <div className="prose max-w-none bg-gray-800 p-8 rounded-lg shadow-lg text-gray-300">
          <p className="text-gray-400">Last updated: March 20, 2025</p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-4 text-white animate-slide-in-left">1. Introduction</h2>
          <p className="text-gray-300">
            Welcome to WePay Pvt Limited &quot;Company&quot; &quot;we&quot; &quot;our&quot; &quot;us&quot;! These Terms of Service &quot;Terms&quot; &quot;Terms of Service&quot; govern your use of our website and services operated by WePay Pvt Limited.
          </p>
          <p className="text-gray-300">
            Our Privacy Policy also governs your use of our Service and explains how we collect, safeguard and disclose information that results from your use of our web pages. Please read it here [Privacy Policy Link].
          </p>
          <p className="text-gray-300">
            By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.
          </p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-4 text-white animate-slide-in-left">2. Communications</h2>
          <p className="text-gray-300">
            By using our Service, you agree to subscribe to newsletters, marketing or promotional materials and other information we may send. However, you may opt out of receiving any, or all, of these communications from us by following the unsubscribe link or by emailing us.
          </p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-4 text-white animate-slide-in-left">3. Purchases</h2>
          <p className="text-gray-300">
            If you wish to purchase any product or service made available through the Service &quot;Purchase&quot;, you may be asked to supply certain information relevant to your Purchase including, without limitation, your credit card number, the expiration date of your credit card, your billing address, and your shipping information.
          </p>
          <p className="text-gray-300">
            You represent and warrant that: (i) you have the legal right to use any credit card(s) or other payment method(s) in connection with any Purchase; and that (ii) the information you supply to us is true, correct and complete.
          </p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-4 text-white animate-slide-in-left">4. Refunds</h2>
          <p className="text-gray-300">
            We issue refunds for Contracts within 30 days of the original purchase of the Contract.
          </p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-4 text-white animate-slide-in-left">5. Content</h2>
          <p className="text-gray-300">
            Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material. You are responsible for the Content that you post on or through the Service, including its legality, reliability, and appropriateness.
          </p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-4 text-white animate-slide-in-left">6. Prohibited Uses</h2>
          <p className="text-gray-300">
            You may use the Service only for lawful purposes and in accordance with Terms. You agree not to use the Service:
          </p>
          <ul className="list-disc pl-8 space-y-2 text-gray-300 animate-fade-in">
            <li>In any way that violates any applicable national or international law or regulation.</li>
            <li>For the purpose of exploiting, harming, or attempting to exploit or harm minors in any way.</li>
            <li>To transmit, or procure the sending of, any advertising or promotional material, including any &quot;junk mail&quot;, &quot;chain letter&quot;, &quot;spam&quot;, or any other similar solicitation.</li>
          </ul>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Terms;

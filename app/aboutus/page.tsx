import React from 'react';
import Link from "next/link";
import logo from "../../Assets/ChatGPT Image May 21, 2025, 05_47_38 AM.png";
import logo1 from "../../Assets/about2.png";
import Image from 'next/image';
// Create a simple Footer component since the original is missing
const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-8 text-center">
      <p>© {new Date().getFullYear()} WePay Pvt Limited. All rights reserved.</p>
    </footer>
  );
};

const About = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto py-12 px-4">
        <Link
          href="/"
          className="mb-8 inline-block text-gray-300 hover:text-white transition-colors"
        >
          ← Back
        </Link>
        <div className=''>
          <h1 className="text-4xl font-bold mb-8 text-center text-white">About WePay</h1>
          
          <div className="bg-gradient-to-r from-purple-50 to-teal-50 rounded-xl p-6 mb-16 bg-slate-700">
            <div className="grid md:grid-cols-2 gap-8 items-center ">
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-800">What is Expense Payout?</h2>
                <p className="text-gray-600 mb-4">
                  Expense payout systems streamline the process of reimbursing employees or other stakeholders for business-related expenditures, 
                  ensuring accuracy, speed, and transparency.
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li>Ease of Access</li>
                  <li>Secure Transactions</li>
                  <li>Wide Acceptance</li>
                  <li>Biometric Authentication</li>
                </ul>
              </div>
              <div className="flex justify-center">
                <Image 
                src={logo1}
                alt="WePay Office" 
                className="w-full h-auto"
              />
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-white">Our Mission</h2>
              <p className="text-gray-300 mb-6">
                At WePay Pvt Limited, our mission is to revolutionize the digital payment landscape by providing 
                secure, fast, and accessible financial services to businesses and individuals alike. We believe 
                in empowering our users with cutting-edge technology that simplifies financial transactions and 
                enhances business operations.
              </p>
              <p className="text-gray-300">
                Founded in 2020, weve quickly grown to become a trusted partner for thousands of businesses 
                across the country, processing millions of transactions securely and efficiently.
              </p>
            </div>
            <div className="rounded-xl overflow-hidden shadow-lg">
              <Image 
                src={logo}
                alt="WePay Office" 
                className="w-full h-auto"
              />
            </div>
          </div>
          
          <div className="mb-16">
            <h2 className="text-2xl font-semibold mb-6 text-center text-white">Our Values</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-medium mb-3 text-blue-400">Innovation</h3>
                <p className="text-gray-300">
                  We continuously strive to innovate and improve our services, staying ahead of the curve 
                  in the rapidly evolving fintech landscape.
                </p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-medium mb-3 text-blue-400">Security</h3>
                <p className="text-gray-300">
                  We prioritize the security of our users data and transactions, implementing 
                  bank-grade security measures to ensure peace of mind.
                </p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-medium mb-3 text-blue-400">Accessibility</h3>
                <p className="text-gray-300">
                  We believe financial services should be accessible to all, and we work tirelessly 
                  to make our platform user-friendly and inclusive.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mb-16">
            <h2 className="text-2xl font-semibold mb-6 text-white">Our Team</h2>
            <p className="text-gray-300 mb-8">
              Our team consists of passionate professionals from diverse backgrounds, united by a common 
              goal: to transform the way people and businesses handle payments. With expertise spanning 
              finance, technology, security, and customer service, we bring a holistic approach to solving 
              the complex challenges of digital payments.
            </p>
            <div className="grid md:grid-cols-4 gap-6">
              {/* Team members would go here */}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">We Trust You And Value Your Money</h2>
          <p className="text-gray-600 text-center max-w-3xl mx-auto mb-12">
            The fastest, most convenient way to accept payments is here. With PayU, you can accept payments via popular
            UPI Apps right at checkout. Choose from multiple transaction flows as per your business needs.
          </p>
          
          <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Key Features</h3>
              <ul className="space-y-2 text-teal-600">
                <li>Salary Payments</li>
                <li>Vendor Payments</li>
                <li>Expense Payout</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Services Offered</h3>
              <ul className="space-y-2 text-teal-600">
                <li>Mobile & DTH Recharge</li>
                <li>Bill Payment</li>
                <li>And More...</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default About;
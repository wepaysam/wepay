import React from 'react';
import { motion } from 'framer-motion';
// import { useRouter } from 'next/router';
import Link from "next/link";
import Footer from '../components/Footer';

const About = () => {
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold mb-8 text-center text-white animate-fade-in">About WePay</h1>
          
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-white animate-slide-in-left">Our Mission</h2>
              <p className="text-gray-300 mb-6">
                At WePay Pvt Limited, our mission is to revolutionize the digital payment landscape by providing 
                secure, fast, and accessible financial services to businesses and individuals alike. We believe 
                in empowering our users with cutting-edge technology that simplifies financial transactions and 
                enhances business operations.
              </p>
              <p className="text-gray-300">
                Founded in 2020, we&apos;ve quickly grown to become a trusted partner for thousands of businesses 
                across the country, processing millions of transactions securely and efficiently.
              </p>
            </div>
            <motion.div
              className="rounded-xl overflow-hidden shadow-lg"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <img 
                src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" 
                alt="WePay Office" 
                className="w-full h-auto"
              />
            </motion.div>
          </div>
          
          <div className="mb-16">
            <h2 className="text-2xl font-semibold mb-6 text-center text-white animate-fade-in">Our Values</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <motion.div
                className="bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow"
                whileHover={{ y: -5 }}
              >
                <h3 className="text-xl font-medium mb-3 text-primary">Innovation</h3>
                <p className="text-gray-300">
                  We continuously strive to innovate and improve our services, staying ahead of the curve 
                  in the rapidly evolving fintech landscape.
                </p>
              </motion.div>
              <motion.div
                className="bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow"
                whileHover={{ y: -5 }}
              >
                <h3 className="text-xl font-medium mb-3 text-primary">Security</h3>
                <p className="text-gray-300">
                  We prioritize the security of our users&apos; data and transactions, implementing 
                  bank-grade security measures to ensure peace of mind.
                </p>
              </motion.div>
              <motion.div
                className="bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow"
                whileHover={{ y: -5 }}
              >
                <h3 className="text-xl font-medium mb-3 text-primary">Accessibility</h3>
                <p className="text-gray-300">
                  We believe financial services should be accessible to all, and we work tirelessly 
                  to make our platform user-friendly and inclusive.
                </p>
              </motion.div>
            </div>
          </div>
          
          <div className="mb-16">
            <h2 className="text-2xl font-semibold mb-6 text-white animate-slide-in-left">Our Team</h2>
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
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default About;

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { services } from "./data/mockData"; // Ensure this path is correct
import ServiceCard from "./components/ServiceCard";
import HeroSection from "./components/HeroSection";
import WavyDivider from "./components/WavyDivider";
import Footer from "./components/Footer";
import MouseGradient from "./components/MouseGradient";
import FaqItem from "./components/FaqItem";

// Import service images (placeholder paths - you'll need to add these images)
import payoutImage from "../Assets/payout.png"; // Temporarily using logo as placeholder
import rechargeImage from "../Assets/recharge.png"; // Temporarily using logo as placeholder
import billPaymentImage from "../Assets/payout1.png"; // Temporarily using logo as placeholder
import screen from "../Assets/screen.png";

// Map service IDs to their images
const serviceImages = {
  "payout": payoutImage,
  "recharge": rechargeImage,
  "bill-payment": billPaymentImage,
};

export default function RootPage() {
  const router = useRouter();
  const featuredServices = services ? services.slice(0, 3) : []; // Take first 3 services for detailed sections
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const checkAuthAndRedirect = async () => {
      try {
        // Get token from cookies
        const token = typeof document !== 'undefined' 
          ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1")
          : null;
        
        // If no token, stay on homepage
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Check if user is authenticated and get user type
        const response = await fetch('/api/auth/verify', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Authentication failed');
        }

        const data = await response.json();
        setIsAuthenticated(true);
        
        // Redirect based on user type
        if (data.user.userType === 'ADMIN') {
          router.push('/admin');
        } else if (data.user.userType === 'VERIFIED') {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Authentication error:', error);
        
        // Clear token cookie
        if (typeof document !== 'undefined') {
          document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
        
        setIsLoading(false);
      }
    };

    // Scroll reveal functionality
    const scrollReveal = () => {
      const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-up, .reveal-down');
      const windowHeight = window.innerHeight;
    
      elements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const revealPoint = 150;
    
        if (rect.top < windowHeight - revealPoint) {
          element.classList.add('active');
        } else {
          element.classList.remove('active');
        }
      });
    };

    checkAuthAndRedirect();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', scrollReveal);
      // Trigger once on mount
      scrollReveal();
      
      return () => window.removeEventListener('scroll', scrollReveal);
    }
  }, [router]);

  // If still loading, show spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-3 text-gray-700 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  // If authenticated user is being redirected, show redirecting message
  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-3 text-gray-700 dark:text-gray-300">Redirecting...</p>
      </div>
    );
  }

  // If not client-side yet, return null to prevent hydration issues
  if (!isClient) {
    return null;
  }

  // For non-authenticated users, show the homepage content
  return (
    <div className="min-h-screen relative overflow-hidden">
      <MouseGradient />
      
      {/* Hero Section */}
      <HeroSection
        title="Fast, Secure Digital Payments"
        subtitle="Send money, pay bills, and manage your finances with ease. All in one platform."
        ctaText="Get Started"
        ctaLink="/Auth/signup"
        imageUrl="/placeholder.svg"
      />

      {/* Services Cards Section */}
      <section className="py-20 px-4 sm:px-6 relative bg-[#0f172a] text-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <span className="reveal-up bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium inline-block mb-4">
              Our Services
            </span>
            
            <h2 className="reveal-up text-3xl md:text-4xl font-bold mb-4">
              Everything you need in one place
            </h2>
            
            <p className="reveal-up text-muted-foreground max-w-2xl mx-auto">
              From everyday payments to business transactions, we've got you covered with our comprehensive suite of services.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services && services.map((service, index) => (
              <ServiceCard
                key={service.id}
                title={service.title}
                description={service.description}
                icon={service.icon}
                color={service.color}
                onClick={() => router.push('/Auth/login')}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
        
        {/* Wavy divider at the bottom of this section */}
        <div className="relative h-24 mt-16">
          <WavyDivider position="bottom" color="#0f172a" height={100} />
        </div>
      </section>

      {/* Detailed Service Sections with Images */}
      <section className="bg-[#0f172a] py-20 relative text-white">
        <div className="container mx-auto px-4">
          {featuredServices.map((service, index) => (
            <div 
              key={service.id}
              className={`grid md:grid-cols-2 gap-12 items-center ${
                index !== featuredServices.length - 1 ? 'mb-24' : ''
              }`}
            >
              {/* Image on left for even indexes, right for odd */}
              {index % 2 === 0 ? (
                <>
                  <div className="rounded-xl overflow-hidden shadow-xl">
                    <Image 
                      src={serviceImages[service.id] || payoutImage} 
                      alt={service.title} 
                      className="w-full h-full object-cover "
                      width={600}
                      height={400}
                    />
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-bold mb-4 text-primary">{service.title}</h3>
                    <p className="text-gray-300 mb-6">
                      {service.description} Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                      Nullam euismod, nisi vel consectetur interdum, nisl nisi aliquam eros, 
                      eget tincidunt nisl nisi vel augue.
                    </p>
                    <Link
                      href="/Auth/login"
                      className="inline-flex items-center text-primary font-medium hover:underline"
                    >
                      Learn more <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h3 className="text-2xl font-bold mb-4 text-primary">{service.title}</h3>
                    <p className="text-gray-300 mb-6">
                      {service.description} Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                      Nullam euismod, nisi vel consectetur interdum, nisl nisi aliquam eros, 
                      eget tincidunt nisl nisi vel augue.
                    </p>
                    <Link
                      href="/Auth/login"
                      className="inline-flex items-center text-primary font-medium hover:underline"
                    >
                      Learn more <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                  
                  <div className="rounded-xl overflow-hidden shadow-xl">
                    <Image 
                      src={serviceImages[service.id] || payoutImage} 
                      alt={service.title} 
                      className="w-full h-auto object-cover aspect-video"
                      width={600}
                      height={400}
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        
        {/* Wavy divider at the bottom of this section */}
        <div className="relative h-24 mt-16">
          <WavyDivider position="bottom" color="#111827" height={100} />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 bg-[#111827] text-white relative">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="reveal-left bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium inline-block mb-4">
                Why Choose Us
              </span>
              
              <h2 className="reveal-left text-3xl md:text-4xl font-bold mb-6">
                The Secure Way to Transfer Money
              </h2>
              
              <div className="reveal-left space-y-4 mb-8">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center mr-3 mt-0.5">
                    <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-1">Instant Transfers</h3>
                    <p className="text-gray-300">Send money to anyone, anywhere, instantly with our fast payment network.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center mr-3 mt-0.5">
                    <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-1">Bank-Level Security</h3>
                    <p className="text-gray-300">Your transactions are protected with enterprise-grade security and encryption.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center mr-3 mt-0.5">
                    <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-1">Low Transaction Fees</h3>
                    <p className="text-gray-300">Enjoy competitive rates and transparent pricing with no hidden charges.</p>
                  </div>
                </div>
              </div>
              
              <div>
                <Link
                  href="/Auth/signup"
                  className="reveal-up inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md font-medium text-white bg-primary hover:bg-primary/90 transition-colors duration-200 gap-2"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            
            <div className="reveal-right">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-card p-1 border border-border/30">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-blue-500/5 rounded-lg" />
                <Image 
                  src={screen}
                  alt="Payment Platform" 
                  className="w-full h-full rounded-lg opacity-90"
                  width={800}
                  height={450}
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-white font-medium">Trusted by thousands of users worldwide</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 bg-[#0f172a] text-white relative">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <span className="reveal-up bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium inline-block mb-4">
              Frequently Asked Questions
            </span>
            
            <h2 className="reveal-up text-3xl md:text-4xl font-bold mb-4 text-white">
              Got Questions? We've Got Answers
            </h2>
            
            <p className="reveal-up text-gray-300 max-w-2xl mx-auto">
              Find answers to the most common questions about our payment services and platform.
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto space-y-4">
            <FaqItem 
              question="How secure is the PayStream platform?" 
              answer="PayStream uses bank-level security with 256-bit encryption for all transactions. We implement multi-factor authentication, regular security audits, and comply with PCI-DSS standards to ensure your data and money are always protected."
              delay={0.1}
            />
            
            <FaqItem 
              question="What are the transaction fees?" 
              answer="Our transaction fees are among the lowest in the industry, starting at just 0.5% per transaction. For high-volume businesses, we offer custom pricing plans. There are no hidden charges or monthly maintenance fees."
              delay={0.2}
            />
            
            <FaqItem 
              question="How long do transfers take to process?" 
              answer="Most transfers are processed instantly or within minutes. For international transfers, it may take 1-2 business days depending on the destination country and banking system. Our dashboard provides real-time tracking of all your transactions."
              delay={0.3}
            />
            
            <FaqItem 
              question="Can I integrate PayStream with my existing systems?" 
              answer="Yes, PayStream offers robust APIs and SDKs for seamless integration with your existing systems, websites, and mobile apps. Our developer documentation provides comprehensive guides and code examples to get you started quickly."
              delay={0.4}
            />
            
            <FaqItem 
              question="What customer support options are available?" 
              answer="We offer 24/7 customer support through multiple channels including live chat, email, and phone. Our dedicated support team is always ready to assist you with any questions or issues you may encounter."
              delay={0.5}
            />
            
            <FaqItem 
              question="How do I get started with PayStream?" 
              answer="Getting started is easy! Simply create an account, complete the verification process, and connect your bank account or card. Once verified, you can start sending and receiving payments immediately. The entire process typically takes less than 10 minutes."
              delay={0.6}
            />
          </div>
          
          <div className="text-center mt-12">
            <Link
              href="/Auth/login"
              className="inline-flex items-center text-primary font-medium hover:underline"
            >
              Log in to see more <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
        
        {/* Wavy divider at the bottom of this section */}
        <div className="relative h-24 mt-16">
          <WavyDivider position="bottom" color="#111827" height={100} />
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
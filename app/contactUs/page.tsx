"use client";
import React, { useState } from 'react';
import Link from "next/link";

// Reuse the Footer component to maintain consistency
const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-8 text-center">
      <p>© {new Date().getFullYear()} WePay Pvt Limited. All rights reserved.</p>
    </footer>
  );
};

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  
  const [submitStatus, setSubmitStatus] = useState(null);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate form submission
    setSubmitStatus('sending');
    setTimeout(() => {
      setSubmitStatus('success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto py-12 px-4">
        <Link
          href="/"
          className="mb-8 inline-block text-gray-300 hover:text-white transition-colors"
        >
          ← Back
        </Link>
        
        <h1 className="text-4xl font-bold mb-8 text-center text-white">Contact Us</h1>
        
        <div className="bg-white rounded-lg shadow-xl overflow-hidden mb-16">
          <div className="grid md:grid-cols-2">
            {/* Contact Information */}
            <div className="bg-blue-600 p-8 text-white">
              <h2 className="text-2xl font-semibold mb-6">Get in Touch</h2>
              <p className="mb-8">
                We&#39;re here to help! Whether you have questions about our services, need technical support, 
                or want to explore partnership opportunities, our team is ready to assist you.
              </p>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Registered Office</h3>
                  <p className="text-blue-100">
                    Shop No. 12, Second Floor<br />
                    Lata Circle, Apna Bazar<br />
                    Jhotwara, Jaipur<br />
                    Rajasthan - 302013<br />
                    India
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Contact Information</h3>
                  <p className="flex items-center text-blue-100 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    +91 9001770984
                  </p>
                  <p className="flex items-center text-blue-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    support@wepay.in
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Business Hours</h3>
                  <p className="text-blue-100">
                    Monday - Friday: 9:00 AM - 6:00 PM<br />
                    Saturday: 10:00 AM - 2:00 PM<br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
            </div>
            
            {/* Contact Form */}
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="subject" className="block text-gray-700 mb-1">Subject</label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a subject</option>
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Partnership">Partnership Opportunity</option>
                    <option value="Billing">Billing Question</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-gray-700 mb-1">Your Message</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  ></textarea>
                </div>
                
                <button
                  type="submit"
                  className={`w-full py-3 px-6 rounded-lg text-white font-medium transition-colors ${
                    submitStatus === 'sending'
                      ? 'bg-gray-500'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  disabled={submitStatus === 'sending'}
                >
                  {submitStatus === 'sending' ? 'Sending...' : 'Send Message'}
                </button>
                
                {submitStatus === 'success' && (
                  <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-lg">
                    Thank you for your message! We&#39;ll get back to you as soon as possible.
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
        
        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-semibold mb-8 text-center text-white">Frequently Asked Questions</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-medium mb-3 text-blue-400">How quickly will I receive a response?</h3>
              <p className="text-gray-300">
                We strive to respond to all inquiries within 24 business hours. For urgent matters,
                we recommend calling our customer support line directly.
              </p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-medium mb-3 text-blue-400">Do you offer technical support on weekends?</h3>
              <p className="text-gray-300">
                Yes, our emergency technical support team is available 24/7 for critical issues.
                Regular support inquiries submitted on weekends will be addressed on the next business day.
              </p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-medium mb-3 text-blue-400">How can I become a WePay partner?</h3>
              <p className="text-gray-300">
                We&#39;re always looking for strategic partnerships! Please use our contact form and select
                Partnership Opportunity as the subject. Our business development team will reach out to discuss options.
              </p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-medium mb-3 text-blue-400">Where can I find documentation for your API?</h3>
              <p className="text-gray-300">
                Comprehensive API documentation is available in our Developer Portal. If you need specific guidance,
                please contact our developer support team through this form.
              </p>
            </div>
          </div>
        </div>
        
        {/* Map Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-semibold mb-4 text-center text-white">Our Location</h2>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="rounded-lg overflow-hidden">
              <div className="w-full h-96" dangerouslySetInnerHTML={{ 
                __html: `<iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3556.7436693146187!2d75.7591347748961!3d26.943339558774706!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x396db3797d517049%3A0xe6159197987e3fae!2sApna%20bazar!5e0!3m2!1sen!2sin!4v1747846550434!5m2!1sen!2sin" 
                  width="100%" 
                  height="100%" 
                  style="border:0;" 
                  allowfullscreen="" 
                  loading="lazy" 
                  referrerpolicy="no-referrer-when-downgrade">
                </iframe>`
              }} />
            </div>
          </div>
        </div>

      </div>
      
      <Footer />
    </div>
  );
};

export default ContactUs;
"use client";
import React, { useState, useRef } from 'react';
import { 
  Scale, Clock, ShieldCheck, FileText, 
  ChevronRight, AlertCircle, Download, Printer,
  BookOpen, Lock, MessageSquare, Check, X, Send, Gavel
} from 'lucide-react';
import emailjs from '@emailjs/browser';

const Terms = () => {
  const lastUpdated = "December 28, 2025";
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'printed'>('idle');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // ============================================
  // EMAILJS CONFIGURATION
  // ============================================
  // You need to sign up at https://www.emailjs.com/ and get these credentials
  const EMAILJS_CONFIG = {
    SERVICE_ID: 'service_2tb6n8m', // Replace with your EmailJS service ID
    TEMPLATE_ID: 'template_cti2m9i', // Replace with your EmailJS template ID
    PUBLIC_KEY: 'gSMucmUsWTMR-sJA-' // Replace with your EmailJS public key
  };

  // Initialize EmailJS (call this once in your app)
  React.useEffect(() => {
    emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
  }, []);

  // ============================================
  // PRINT FUNCTIONALITY
  // ============================================
  const handlePrint = () => {
    setPrintStatus('printing');
    window.print();
    setTimeout(() => {
      setPrintStatus('printed');
      setTimeout(() => setPrintStatus('idle'), 2000);
    }, 1000);
  };

  // ============================================
  // EMAIL FUNCTIONALITY WITH EMAILJS
  // ============================================
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !isValidEmail(email)) {
      setEmailStatus('error');
      setStatusMessage('Please enter a valid email address');
      return;
    }

    setIsSending(true);
    setEmailStatus('idle');

    try {
      // Prepare email data
      const emailData = {
        to_email: email,
        to_name: email.split('@')[0], // Use username from email
        from_name: 'Terms of Service Platform',
        subject: 'Your Terms of Service Document',
        message: `
          Dear User,
          
          As requested, please find attached your Terms of Service document.
          
          Document Details:
          - Title: Terms of Service
          - Last Updated: ${lastUpdated}
          - Sent on: ${new Date().toLocaleDateString()}
          
          This document contains important legal information about your use of our platform.
          
          You can also view the terms online anytime at your account dashboard.
          
          Best regards,
          The Platform Team
          
          ---
          This is an automated message. Please do not reply to this email.
        `,
        terms_content: generateTermsContent(), // You can customize what content to send
        company_name: 'Platform Inc.',
        reply_to: 'noreply@platform.com',
        current_date: new Date().toLocaleDateString()
      };

      // Send email using EmailJS
      const response = await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        emailData
      );

      if (response.status === 200) {
        setEmailStatus('success');
        setStatusMessage(`Terms of Service successfully sent to ${email}`);
        
        // Close modal after success
        setTimeout(() => {
          setIsEmailModalOpen(false);
          setEmail('');
          setEmailStatus('idle');
          setStatusMessage('');
        }, 3000);
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Email sending error:', error);
      setEmailStatus('error');
      setStatusMessage('Failed to send email. Please try again later.');
    } finally {
      setIsSending(false);
    }
  };

  // Helper function to validate email
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Generate terms content for the email
  const generateTermsContent = () => {
    return `
      TERMS OF SERVICE
      Last Updated: ${lastUpdated}
      
      1. ACCEPTANCE OF AGREEMENT
      Welcome to our platform. These Terms of Service constitute a legally binding agreement between you and Platform Inc.
      
      2. USER RESPONSIBILITIES & SAFETY
      You agree to provide accurate information and maintain account confidentiality.
      
      3. INTELLECTUAL PROPERTY & DATA OWNERSHIP
      You retain ownership of your content while granting us necessary licenses.
      
      4. SUBSCRIPTION BILLING & REFUNDS
      Premium features require paid subscription with recurring billing.
      
      5. LIMITATION OF LIABILITY
      Platform Inc. shall not be liable for indirect or consequential damages.
      
      6. TERMINATION OF SERVICE
      We may terminate access for violations or non-payment.
      
      For the complete terms, please visit: https://platform.com/terms
    `;
  };

  // ============================================
  // DOWNLOAD AS PDF FUNCTIONALITY (Alternative)
  // ============================================
  const handleDownloadPDF = () => {
    const content = document.querySelector('.lg\\:col-span-9')?.innerHTML || '';
    const blob = new Blob([`<html><body>${content}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terms-of-service-${lastUpdated.replace(/ /g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0b0d0e] text-[#9ca3af] animate-in fade-in duration-700 relative">
      
      {/* PRINT-ONLY STYLES */}
      <style jsx global>{`
        @media print {
          aside, button, .no-print, header .flex-row div:last-child { display: none !important; }
          body { background: white !important; color: black !important; }
          .max-w-5xl { max-width: 100% !important; }
          .text-white { color: black !important; }
          .bg-[#111315] { background: #f9fafb !important; border: 1px solid #ddd !important; }
        }
      `}</style>

      {/* EMAIL MODAL */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111315] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <MessageSquare size={18} className="text-purple-400" /> Send to Email
              </h3>
              <button 
                onClick={() => {
                  setIsEmailModalOpen(false);
                  setEmail('');
                  setEmailStatus('idle');
                  setStatusMessage('');
                }} 
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Status Messages */}
            {emailStatus === 'success' && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400 text-sm">
                <Check size={16} />
                {statusMessage}
              </div>
            )}
            
            {emailStatus === 'error' && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={16} />
                {statusMessage}
              </div>
            )}

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-2 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="name@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-all"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailStatus === 'error') {
                      setEmailStatus('idle');
                      setStatusMessage('');
                    }
                  }}
                  disabled={isSending}
                />
              </div>
              
              <div className="text-xs text-gray-500 space-y-2">
                <p className="flex items-center gap-2">
                  <ShieldCheck size={12} className="text-green-400" />
                  Your email will only be used to send this document
                </p>
                <p className="flex items-center gap-2">
                  <Lock size={12} className="text-blue-400" />
                  We respect your privacy and won't share your email
                </p>
              </div>
              
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    setIsEmailModalOpen(false);
                    setEmail('');
                    setEmailStatus('idle');
                    setStatusMessage('');
                  }}
                  disabled={isSending}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-white/10 transition-all text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                
                <button 
                  type="submit"
                  disabled={isSending}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Send Document
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-10">
        <header className="mb-12 border-b border-white/5 pb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <Scale className="text-purple-400" size={28} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-purple-500/80">Compliance & Privacy</span>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Terms of Service</h1>
            <p className="text-gray-500 mt-3 flex items-center gap-2 text-sm">
              <Clock size={14} /> Last Revision: {lastUpdated}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button 
              onClick={handlePrint} 
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg border border-white/5 transition-all text-sm"
            >
              {printStatus === 'printing' ? 'Printing...' : <><Printer size={16} /> Print</>}
            </button>
            <button 
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg border border-blue-600/20 transition-all text-sm"
            >
              <Download size={16} /> Download PDF
            </button>
            <button 
              onClick={() => setIsEmailModalOpen(true)} 
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg border border-purple-600/20 transition-all text-sm"
            >
              <MessageSquare size={16} /> Email Copy
            </button>
          </div>
        </header>

        {/* Rest of your component remains the same */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* NAVIGATION SIDEBAR */}
          <aside className="lg:col-span-3 hidden lg:block no-print">
            <div className="sticky top-8 space-y-6">
              <nav className="flex flex-col gap-1">
                {['Introduction', 'Account Safety', 'Data Rights', 'Payments', 'Liability', 'Termination'].map((item) => (
                  <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="px-3 py-2 text-sm hover:text-purple-400 hover:bg-purple-500/5 rounded-lg transition-all">
                    {item}
                  </a>
                ))}
              </nav>
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                <ShieldCheck size={20} className="text-purple-400 mb-2" />
                <p className="text-[11px] text-gray-400">This document is legally binding under international SaaS regulations (GDPR/CCPA).</p>
              </div>
            </div>
          </aside>

          {/* MAIN LEGAL CONTENT */}
          <div className="lg:col-span-9 space-y-16 text-[15px] leading-[1.8]">
            
            <TermSection id="introduction" number="01" title="Acceptance of Agreement">
              Welcome to our platform. These Terms of Service constitute a legally binding agreement between you and Platform Inc. By accessing our services, you confirm that you have read, understood, and agreed to be bound by these rules.
              <p className="mt-4">If you are using the Service on behalf of a company, you represent that you have the legal authority to bind that entity to these terms.</p>
            </TermSection>

            <TermSection id="account-safety" number="02" title="User Responsibilities & Safety">
              To use our advanced features, you must maintain an active account. You agree to:
              <ul className="list-disc ml-6 mt-4 space-y-2">
                <li>Provide accurate and truthful information during registration.</li>
                <li>Maintain the absolute confidentiality of your login credentials.</li>
                <li>Notify us within 24 hours of any unauthorized account access.</li>
              </ul>
              <div className="mt-6 p-4 bg-white/[0.02] border border-white/5 rounded-xl flex gap-4">
                <Lock className="text-purple-400 shrink-0" size={20} />
                <p className="text-xs text-gray-500 italic">"We reserve the right to disable any user name or password if, in our opinion, you have failed to comply with any of these terms."</p>
              </div>
            </TermSection>

            <TermSection id="data-rights" number="03" title="Intellectual Property & Data Ownership">
              We respect your creative rights. You retain full ownership of any content you upload. However, you grant us a worldwide, non-exclusive license to host, store, and display your data solely for providing the service.
              <p className="mt-4">Our proprietary algorithms, codebases, and interface designs remain the exclusive property of Platform Inc. and are protected by copyright laws.</p>
            </TermSection>

            <TermSection id="payments" number="04" title="Subscription Billing & Refunds">
              Premium features require a paid subscription. Billing is handled on a recurring monthly or annual basis. 
              <ul className="list-disc ml-6 mt-4 space-y-2">
                <li>Fees are non-refundable except where required by local law.</li>
                <li>You may cancel your subscription at any time through the billing dashboard.</li>
                <li>Failure to pay will result in a 7-day grace period before account suspension.</li>
              </ul>
            </TermSection>

            <TermSection id="liability" number="05" title="Limitation of Liability">
              Platform Inc. shall not be liable for any indirect, incidental, or consequential damages resulting from your use or inability to use the Service. We provide the service "AS IS" without warranties of any kind.
            </TermSection>

            <TermSection id="termination" number="06" title="Termination of Service">
              We may terminate your access immediately if you violate our community guidelines or fail to pay subscription fees. Upon termination, your right to access data may be limited, and you should export your content regularly.
            </TermSection>

            <footer className="pt-10 border-t border-white/5 text-center no-print">
              <Gavel size={24} className="text-gray-600 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Still have legal concerns? Reach out to <span className="text-purple-400 cursor-pointer">legal@platform.com</span></p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

interface TermSectionProps {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}

const TermSection = ({ id, number, title, children }: TermSectionProps) => (
  <section id={id} className="scroll-mt-10 group">
    <div className="flex items-center gap-4 mb-4">
      <span className="text-[10px] font-mono text-purple-500 font-bold bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">ARTICLE {number}</span>
      <div className="h-[1px] flex-1 bg-white/5" />
    </div>
    <h2 className="text-2xl font-semibold text-white mb-4">{title}</h2>
    <div className="text-gray-400">{children}</div>
  </section>
);

export default Terms;
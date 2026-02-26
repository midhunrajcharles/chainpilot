"use client";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import FloatingParticles from "@/components/FloatingParticles";
import { useAuthNavigation } from "@/hooks/useAuthNavigation";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FaBolt, FaChartLine, FaClock, FaMobileAlt, FaQrcode, FaRobot, FaSearch, FaShieldAlt, FaUsers } from "react-icons/fa";

export default function Home() {
  const { authenticated } = usePrivy();
  const { navigateToDashboard } = useAuthNavigation();
  const [showConnectMsg, setShowConnectMsg] = useState(false);

  return (
    <>
      {showConnectMsg && (
        <div className="fixed top-0 left-0 w-full z-50 bg-red-500/90 backdrop-blur-xl text-white text-center py-3 font-semibold shadow-lg border-b border-red-400/20">
          Please connect your wallet first to start using ChainPilot AI.
        </div>
      )}
      
      <div className="min-h-screen bg-[#111111] font-sans relative overflow-x-hidden">
        {/* Animated Background Elements — very subtle gold ambient light */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-[#C6A75E]/5 to-transparent rounded-full blur-3xl animate-pulse" style={{animationDuration:'6s'}}></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-[#C6A75E]/4 to-transparent rounded-full blur-3xl animate-pulse" style={{animationDuration:'8s',animationDelay:'2s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] bg-gradient-to-r from-[#C6A75E]/3 to-transparent rounded-full blur-3xl animate-pulse" style={{animationDuration:'10s',animationDelay:'1s'}}></div>
        </div>

        {/* Floating Particles */}
        <FloatingParticles />
        
        <header
          className={`w-full flex justify-between items-center px-4 md:px-8 py-6 border-b border-[#C6A75E]/10 bg-black/40 backdrop-blur-2xl sticky top-0 z-50 ${
            showConnectMsg ? "mt-12" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-transparent border border-[#C6A75E]/30 rounded-xl flex items-center justify-center">
                <FaRobot className="text-[#C6A75E] text-lg" />
              </div>
            </div>
            <div>
              <h1 className="text-xl text-[#F8F6F2] tracking-widest" style={{fontFamily:'var(--font-display,Georgia,serif)',fontWeight:300}}>
                ChainPilot AI
              </h1>
              <p className="text-[#8A857E] text-xs tracking-wider uppercase" style={{fontFamily:'var(--font-body)',letterSpacing:'0.12em'}}>AI-Powered DeFi Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ConnectWalletButton />
            {authenticated && (
              <button
                onClick={navigateToDashboard}
                className="btn-luxury text-xs"
              >
                Dashboard
              </button>
            )}
          </div>
        </header>

        <main className="relative z-10">
          {/* Hero Section */}
          <section className="px-4 md:px-8 py-20 md:py-32">
            <div className="max-w-7xl mx-auto text-center">
              <div className="mb-8">
                <h1 className="text-5xl md:text-7xl lg:text-8xl mb-8" style={{fontFamily:'var(--font-display,Georgia,serif)',fontWeight:300,letterSpacing:'0.05em',lineHeight:'1.1'}}>
                  <span className="text-[#F8F6F2]">
                    The Future of
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-[#C6A75E] via-[#E8D5A3] to-[#C6A75E] bg-clip-text text-transparent">
                    DeFi Management
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-[#B9B4AA] max-w-2xl mx-auto leading-relaxed" style={{fontWeight:300,letterSpacing:'0.01em'}}>
                  Experience the power of AI-driven cryptocurrency management with ChainPilot AI. 
                  Seamlessly manage your digital assets, execute smart transactions, and navigate 
                  the DeFi ecosystem with intelligent automation.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                <button
                  onClick={() => {
                    if (!authenticated) {
                      setShowConnectMsg(true);
                      setTimeout(() => setShowConnectMsg(false), 3000);
                    } else {
                      navigateToDashboard();
                    }
                  }}
                  className="btn-luxury-filled"
                >
                  Get Started
                </button>
                <Link
                  href="#features"
                  className="btn-luxury"
                >
                  Learn More
                </Link>
              </div>

             
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="px-4 md:px-8 py-20">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <p className="text-[#C6A75E] text-xs tracking-[0.25em] uppercase mb-4" style={{fontFamily:'var(--font-body)',fontWeight:400}}>Platform Capabilities</p>
                <h2 className="text-4xl md:text-5xl text-[#F8F6F2] mb-6" style={{fontFamily:'var(--font-display,Georgia,serif)',fontWeight:300,letterSpacing:'0.04em'}}>
                  Powerful Features
                </h2>
                <div className="luxury-divider max-w-xs mx-auto"></div>
                <p className="text-[#8A857E] max-w-2xl mx-auto mt-6" style={{fontWeight:300}}>
                  Everything you need to manage your DeFi portfolio with AI-powered intelligence
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* AI Chat Assistant */}
                <div className="bg-white/[0.02] backdrop-blur-xl border border-[#C6A75E]/10 rounded-2xl p-8 hover:border-[#C6A75E]/25 transition-all duration-500 group">
                  <div className="w-14 h-14 bg-transparent border border-[#C6A75E]/20 rounded-xl flex items-center justify-center mb-6 group-hover:border-[#C6A75E]/50 transition-all duration-500">
                    <FaRobot className="text-[#C6A75E] text-xl" />
                  </div>
                  <h3 className="text-lg text-[#F8F6F2] mb-4" style={{fontFamily:'var(--font-display,Georgia,serif)',fontWeight:400,letterSpacing:'0.03em'}}>AI Chat Assistant</h3>
                  <div className="h-px bg-gradient-to-r from-[#C6A75E]/20 to-transparent mb-4"></div>
                  <p className="text-[#8A857E] leading-relaxed text-sm" style={{fontWeight:300}}>
                    Interact with your DeFi portfolio using natural language. Execute transactions, 
                    check balances, and get insights through conversational AI.
                  </p>
                </div>

                {/* Advanced Analytics */}
                <div className="bg-white/[0.02] backdrop-blur-xl border border-[#C6A75E]/10 rounded-2xl p-8 hover:border-[#C6A75E]/25 transition-all duration-500 group">
                  <div className="w-14 h-14 bg-transparent border border-[#C6A75E]/20 rounded-xl flex items-center justify-center mb-6 group-hover:border-[#C6A75E]/50 transition-all duration-500">
                    <FaChartLine className="text-[#C6A75E] text-xl" />
                  </div>
                  <h3 className="text-lg text-[#F8F6F2] mb-4" style={{fontFamily:'var(--font-display,Georgia,serif)',fontWeight:400,letterSpacing:'0.03em'}}>Advanced Analytics</h3>
                  <div className="h-px bg-gradient-to-r from-[#C6A75E]/20 to-transparent mb-4"></div>
                  <p className="text-[#8A857E] leading-relaxed text-sm" style={{fontWeight:300}}>
                    Get comprehensive insights into your portfolio performance, spending patterns, 
                    and market trends with real-time analytics.
                  </p>
                </div>

                {/* Smart Transactions */}
                <div className="bg-white/[0.02] backdrop-blur-xl border border-[#C6A75E]/10 rounded-2xl p-8 hover:border-[#C6A75E]/25 transition-all duration-500 group">
                  <div className="w-14 h-14 bg-transparent border border-[#C6A75E]/20 rounded-xl flex items-center justify-center mb-6 group-hover:border-[#C6A75E]/50 transition-all duration-500">
                    <FaBolt className="text-[#C6A75E] text-xl" />
                  </div>
                  <h3 className="text-lg text-[#F8F6F2] mb-4" style={{fontFamily:'var(--font-display,Georgia,serif)',fontWeight:400,letterSpacing:'0.03em'}}>Smart Transactions</h3>
                  <div className="h-px bg-gradient-to-r from-[#C6A75E]/20 to-transparent mb-4"></div>
                  <p className="text-[#8A857E] leading-relaxed text-sm" style={{fontWeight:300}}>
                    Schedule payments, set up conditional transactions, and automate your DeFi 
                    operations with intelligent transaction management.
                  </p>
                </div>

                {/* Team Collaboration */}
                <div className="bg-white/[0.02] backdrop-blur-xl border border-[#C6A75E]/10 rounded-2xl p-8 hover:border-[#C6A75E]/25 transition-all duration-500 group">
                  <div className="w-14 h-14 bg-transparent border border-[#C6A75E]/20 rounded-xl flex items-center justify-center mb-6 group-hover:border-[#C6A75E]/50 transition-all duration-500">
                    <FaUsers className="text-[#C6A75E] text-xl" />
                  </div>
                  <h3 className="text-lg text-[#F8F6F2] mb-4" style={{fontFamily:'var(--font-display,Georgia,serif)',fontWeight:400,letterSpacing:'0.03em'}}>Team Collaboration</h3>
                  <div className="h-px bg-gradient-to-r from-[#C6A75E]/20 to-transparent mb-4"></div>
                  <p className="text-[#8A857E] leading-relaxed text-sm" style={{fontWeight:300}}>
                    Create teams, manage shared wallets, and collaborate on DeFi strategies 
                    with multi-signature support and approval workflows.
                  </p>
                </div>

                {/* Security & Risk Management */}
                <div className="bg-white/[0.02] backdrop-blur-xl border border-[#C6A75E]/10 rounded-2xl p-8 hover:border-[#C6A75E]/25 transition-all duration-500 group">
                  <div className="w-14 h-14 bg-transparent border border-[#C6A75E]/20 rounded-xl flex items-center justify-center mb-6 group-hover:border-[#C6A75E]/50 transition-all duration-500">
                    <FaShieldAlt className="text-[#C6A75E] text-xl" />
                  </div>
                  <h3 className="text-lg text-[#F8F6F2] mb-4" style={{fontFamily:'var(--font-display,Georgia,serif)',fontWeight:400,letterSpacing:'0.03em'}}>Security & Risk</h3>
                  <div className="h-px bg-gradient-to-r from-[#C6A75E]/20 to-transparent mb-4"></div>
                  <p className="text-[#8A857E] leading-relaxed text-sm" style={{fontWeight:300}}>
                    Advanced security features including risk assessment, scam detection, 
                    and transaction validation to protect your assets.
                  </p>
                </div>

                {/* Mobile Optimized */}
                <div className="bg-white/[0.02] backdrop-blur-xl border border-[#C6A75E]/10 rounded-2xl p-8 hover:border-[#C6A75E]/25 transition-all duration-500 group">
                  <div className="w-14 h-14 bg-transparent border border-[#C6A75E]/20 rounded-xl flex items-center justify-center mb-6 group-hover:border-[#C6A75E]/50 transition-all duration-500">
                    <FaMobileAlt className="text-[#C6A75E] text-xl" />
                  </div>
                  <h3 className="text-lg text-[#F8F6F2] mb-4" style={{fontFamily:'var(--font-display,Georgia,serif)',fontWeight:400,letterSpacing:'0.03em'}}>Mobile Optimised</h3>
                  <div className="h-px bg-gradient-to-r from-[#C6A75E]/20 to-transparent mb-4"></div>
                  <p className="text-[#8A857E] leading-relaxed text-sm" style={{fontWeight:300}}>
                    Access your DeFi portfolio anywhere with our fully responsive design 
                    and mobile-optimized interface.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
        
        </main>

        {/* Footer */}
        <footer className="border-t border-[#C6A75E]/10 bg-black/30 backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-transparent border border-[#C6A75E]/30 rounded-xl flex items-center justify-center">
                    <FaRobot className="text-[#C6A75E] text-lg" />
                  </div>
                  <div>
                    <h3 className="text-lg text-[#F8F6F2] tracking-widest" style={{fontFamily:'var(--font-display,Georgia,serif)',fontWeight:300}}>
                      ChainPilot AI
                    </h3>
                    <p className="text-[#8A857E] text-xs tracking-wider uppercase" style={{letterSpacing:'0.12em'}}>AI-Powered DeFi Assistant</p>
                  </div>
                </div>
                <p className="text-[#8A857E] max-w-md text-sm" style={{fontWeight:300,lineHeight:'1.8'}}>
                  Empowering users with intelligent DeFi management through AI-driven automation 
                  and advanced analytics.
                </p>
              </div>
              
              <div>
                <h4 className="text-[#C6A75E] mb-6" style={{fontSize:'0.65rem',letterSpacing:'0.2em',textTransform:'uppercase',fontWeight:400}}>Product</h4>
                <ul className="space-y-3 text-[#8A857E] text-sm">
                  <li><Link href="#features" className="luxury-link">Features</Link></li>
                  <li><Link href="#" className="luxury-link">Analytics</Link></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-[#C6A75E] mb-6" style={{fontSize:'0.65rem',letterSpacing:'0.2em',textTransform:'uppercase',fontWeight:400}}>Support</h4>
                <ul className="space-y-3 text-[#8A857E] text-sm">
                  <li><Link href="#" className="luxury-link">Contact</Link></li>
                  <li><Link href="#" className="luxury-link">Security</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="luxury-divider"></div>
            <div className="text-center text-[#4A4641] text-xs" style={{letterSpacing:'0.1em'}}>
              <p>&copy; 2026 ChainPilot AI. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
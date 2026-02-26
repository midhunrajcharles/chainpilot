"use client";
import DashboardSidebar from "@/components/DashboardSidebar";
import AdvancedTransactions from "@/components/dashboard/AdvancedTransactions";
import AnalyticsDashboard from "@/components/dashboard/AnalyticsDashboard";
import AnomalyDetectionPanel from "@/components/dashboard/AnomalyDetectionPanel";
import ChatInterface from "@/components/dashboard/ChatInterface";
import ContactManagement from "@/components/dashboard/ContactManagement";
import DefiStrategies from "@/components/dashboard/DefiStrategies";
import MultiChainWallet from "@/components/dashboard/MultiChainWallet";
import NotificationManagement from "@/components/dashboard/NotificationManagement";
import SecurityPoliciesPanel from "@/components/dashboard/SecurityPoliciesPanel";
import SecurityRisk from "@/components/dashboard/SecurityRisk";
import SharingIntegration from "@/components/dashboard/SharingIntegration";
import TeamWorkspace from "@/components/dashboard/TeamWorkspace";
import TransactionHistory from "@/components/dashboard/TransactionHistory";
import ContractScanner from "@/components/security/ContractScanner";
import MonitoringPanel from "@/components/security/MonitoringPanel";
import { useLogout, usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaBars, FaBell, FaChartLine, FaHistory, FaLeaf, FaQrcode, FaRobot, FaShieldAlt, FaSignOutAlt, FaTimes, FaUsers, FaWallet } from "react-icons/fa";
import { Globe, Radar, TriangleAlert } from "lucide-react";

type DashboardSection = 
  | "analytics"
  | "contacts" 
  | "teams"
  | "transactions"
  | "transaction-history"
  | "security"
  | "sharing"
  | "chat"
  | "notifications"
  | "contractScanner"
  | "monitoring"
  | "anomaly"
  | "multichain"
  | "policies"
  | "defi";

export default function Dashboard() {
  const { authenticated, user } = usePrivy();
  const { logout } = useLogout({
    onSuccess: () => {
      console.log('User successfully logged out');
      window.location.href = "/";
    }
  });
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<DashboardSection>("analytics");
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!authenticated) {
      router.push("/");
      return;
    }
    setIsLoading(false);
  }, [authenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border border-[#C6A75E]/30 border-t-[#C6A75E] rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-[#8A857E] text-sm tracking-widest uppercase" style={{letterSpacing:'0.15em'}}>Loading</p>
        </div>
      </div>
    );
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case "analytics":
        return <AnalyticsDashboard setActiveSection={setActiveSection} />;
      case "contacts":
        return <ContactManagement />;
      case "teams":
        return <TeamWorkspace />;
      case "transactions":
        return <AdvancedTransactions />;
      case "transaction-history":
        return <TransactionHistory />;
      case "security":
        return <SecurityRisk />;
      case "sharing":
        return <SharingIntegration />;
      case "chat":
        return <ChatInterface />;
      case "notifications":
        return <NotificationManagement />;
      case "contractScanner":
        return <ContractScanner />;
      case "monitoring":
        return <MonitoringPanel />;
      case "anomaly":
        return <AnomalyDetectionPanel />;
      case "multichain":
        return <MultiChainWallet />;
      case "policies":
        return <SecurityPoliciesPanel />;
      case "defi":
        return <DefiStrategies />;
      default:
        return <AnalyticsDashboard setActiveSection={setActiveSection} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#111111]">
      {/* Ambient Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#C6A75E]/4 to-transparent rounded-full blur-3xl animate-pulse" style={{animationDuration:'7s'}}></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-[#C6A75E]/3 to-transparent rounded-full blur-3xl animate-pulse" style={{animationDuration:'9s',animationDelay:'2s'}}></div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed left-0 top-0 h-full w-64 bg-black/50 backdrop-blur-2xl border-r border-[#C6A75E]/10 z-50" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#C6A75E]/10">
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-transparent border border-[#C6A75E]/30 rounded-xl flex items-center justify-center">
                    <FaRobot className="text-[#C6A75E] text-lg" />
                  </div>
                  <div>
                    <h2 className="text-base text-[#F8F6F2] tracking-widest" style={{fontFamily:'var(--font-display,Georgia,serif)',fontWeight:300}}>
                      ChainPilot AI
                    </h2>
                    <p className="text-[#8A857E] text-xs uppercase" style={{letterSpacing:'0.1em',fontSize:'0.6rem'}}>Dashboard</p>
                  </div>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-[#8A857E] hover:text-[#C6A75E] hover:bg-[#C6A75E]/5 rounded-lg transition-all duration-400"
                  title="Close menu"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>
            </div>
            <nav className="p-4 space-y-6">
              {/* Overview */}
              <div>
                <div className="px-3 mb-3">
                  <h3 className="text-[#4A4641] uppercase" style={{fontSize:'0.6rem',letterSpacing:'0.18em',fontWeight:400}}>Overview</h3>
                </div>
                <div className="space-y-1">
                  {[
                    { id: "analytics", label: "Analytics", icon: <FaChartLine className="text-lg" /> },
                    { id: "chat", label: "AI Chat", icon: <FaRobot className="text-lg" /> }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id as DashboardSection);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none transition-all duration-400 group border-l-2 ${
                        activeSection === item.id
                          ? "bg-[#C6A75E]/8 border-[#C6A75E] text-[#F8F6F2] pl-2"
                          : "text-[#8A857E] hover:text-[#F8F6F2] hover:bg-[#C6A75E]/5 border-transparent"
                      }`}
                    >
                      <div className={`transition-colors duration-400 ${
                        activeSection === item.id ? "text-[#C6A75E]" : "text-[#8A857E] group-hover:text-[#C6A75E]"
                      }`}>
                        {item.icon}
                      </div>
                      <span className={`text-xs tracking-wide ${
                        activeSection === item.id ? "text-[#F8F6F2]" : "text-[#8A857E] group-hover:text-[#F8F6F2]"
                      }`} style={{letterSpacing:'0.04em'}}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Transactions */}
              <div>
                <div className="px-3 mb-3">
                  <h3 className="text-[#4A4641] uppercase" style={{fontSize:'0.6rem',letterSpacing:'0.18em',fontWeight:400}}>Transactions</h3>
                </div>
                <div className="space-y-1">
                  {[
                    { id: "transactions", label: "Send", icon: <FaWallet className="text-lg" /> },
                    { id: "transaction-history", label: "History", icon: <FaHistory className="text-lg" /> }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id as DashboardSection);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none transition-all duration-400 group border-l-2 ${
                        activeSection === item.id
                          ? "bg-[#C6A75E]/8 border-[#C6A75E] text-[#F8F6F2] pl-2"
                          : "text-[#8A857E] hover:text-[#F8F6F2] hover:bg-[#C6A75E]/5 border-transparent"
                      }`}
                    >
                      <div className={`transition-colors duration-400 ${
                        activeSection === item.id ? "text-[#C6A75E]" : "text-[#8A857E] group-hover:text-[#C6A75E]"
                      }`}>
                        {item.icon}
                      </div>
                      <span className={`text-xs tracking-wide ${
                        activeSection === item.id ? "text-[#F8F6F2]" : "text-[#8A857E] group-hover:text-[#F8F6F2]"
                      }`} style={{letterSpacing:'0.04em'}}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contacts & Teams */}
              <div>
                <div className="px-3 mb-3">
                  <h3 className="text-[#4A4641] uppercase" style={{fontSize:'0.6rem',letterSpacing:'0.18em',fontWeight:400}}>Contacts &amp; Teams</h3>
                </div>
                <div className="space-y-1">
                  {[
                    { id: "contacts", label: "Contacts", icon: <FaUsers className="text-lg" /> },
                    { id: "teams", label: "Teams", icon: <FaUsers className="text-lg" /> }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id as DashboardSection);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none transition-all duration-400 group border-l-2 ${
                        activeSection === item.id
                          ? "bg-[#C6A75E]/8 border-[#C6A75E] text-[#F8F6F2] pl-2"
                          : "text-[#8A857E] hover:text-[#F8F6F2] hover:bg-[#C6A75E]/5 border-transparent"
                      }`}
                    >
                      <div className={`transition-colors duration-400 ${
                        activeSection === item.id ? "text-[#C6A75E]" : "text-[#8A857E] group-hover:text-[#C6A75E]"
                      }`}>
                        {item.icon}
                      </div>
                      <span className={`text-xs tracking-wide ${
                        activeSection === item.id ? "text-[#F8F6F2]" : "text-[#8A857E] group-hover:text-[#F8F6F2]"
                      }`} style={{letterSpacing:'0.04em'}}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Security */}
              <div>
                <div className="px-3 mb-3">
                  <h3 className="text-[#4A4641] uppercase" style={{fontSize:'0.6rem',letterSpacing:'0.18em',fontWeight:400}}>Security</h3>
                </div>
                <div className="space-y-1">
                  {[
                    { id: "contractScanner", label: "Contract Scanner", icon: <FaShieldAlt className="text-lg" /> },
                    { id: "monitoring", label: "Monitoring", icon: <Radar className="h-5 w-5" /> },
                    { id: "anomaly", label: "Anomaly Detector", icon: <TriangleAlert className="h-5 w-5" /> },
                    { id: "policies", label: "Security Policies", icon: <FaShieldAlt className="text-lg" /> }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id as DashboardSection);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none transition-all duration-400 group border-l-2 ${
                        activeSection === item.id
                          ? "bg-[#C6A75E]/8 border-[#C6A75E] text-[#F8F6F2] pl-2"
                          : "text-[#8A857E] hover:text-[#F8F6F2] hover:bg-[#C6A75E]/5 border-transparent"
                      }`}
                    >
                      <div className={`transition-colors duration-400 ${
                        activeSection === item.id ? "text-[#C6A75E]" : "text-[#8A857E] group-hover:text-[#C6A75E]"
                      }`}>
                        {item.icon}
                      </div>
                      <span className={`text-xs tracking-wide ${
                        activeSection === item.id ? "text-[#F8F6F2]" : "text-[#8A857E] group-hover:text-[#F8F6F2]"
                      }`} style={{letterSpacing:'0.04em'}}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tools */}
              <div>
                <div className="px-3 mb-3">
                  <h3 className="text-[#4A4641] uppercase" style={{fontSize:'0.6rem',letterSpacing:'0.18em',fontWeight:400}}>Tools</h3>
                </div>
                <div className="space-y-1">
                  {[
                    { id: "security", label: "Security", icon: <FaShieldAlt className="text-lg" /> },
                    { id: "sharing", label: "Sharing", icon: <FaQrcode className="text-lg" /> },
                    { id: "notifications", label: "Notifications", icon: <FaBell className="text-lg" /> }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id as DashboardSection);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none transition-all duration-400 group border-l-2 ${
                        activeSection === item.id
                          ? "bg-[#C6A75E]/8 border-[#C6A75E] text-[#F8F6F2] pl-2"
                          : "text-[#8A857E] hover:text-[#F8F6F2] hover:bg-[#C6A75E]/5 border-transparent"
                      }`}
                    >
                      <div className={`transition-colors duration-400 ${
                        activeSection === item.id ? "text-[#C6A75E]" : "text-[#8A857E] group-hover:text-[#C6A75E]"
                      }`}>
                        {item.icon}
                      </div>
                      <span className={`text-xs tracking-wide ${
                        activeSection === item.id ? "text-[#F8F6F2]" : "text-[#8A857E] group-hover:text-[#F8F6F2]"
                      }`} style={{letterSpacing:'0.04em'}}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* DeFi & Multi-Chain */}
              <div>
                <div className="px-3 mb-3">
                  <h3 className="text-[#4A4641] uppercase" style={{fontSize:'0.6rem',letterSpacing:'0.18em',fontWeight:400}}>DeFi &amp; Multi-Chain</h3>
                </div>
                <div className="space-y-1">
                  {[
                    { id: "multichain", label: "Multi-Chain Wallet", icon: <Globe className="h-5 w-5" /> },
                    { id: "defi", label: "DeFi Strategies", icon: <FaLeaf className="text-lg" /> }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id as DashboardSection);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none transition-all duration-400 group border-l-2 ${
                        activeSection === item.id
                          ? "bg-[#C6A75E]/8 border-[#C6A75E] text-[#F8F6F2] pl-2"
                          : "text-[#8A857E] hover:text-[#F8F6F2] hover:bg-[#C6A75E]/5 border-transparent"
                      }`}
                    >
                      <div className={`transition-colors duration-400 ${
                        activeSection === item.id ? "text-[#C6A75E]" : "text-[#8A857E] group-hover:text-[#C6A75E]"
                      }`}>
                        {item.icon}
                      </div>
                      <span className={`text-xs tracking-wide ${
                        activeSection === item.id ? "text-[#F8F6F2]" : "text-[#8A857E] group-hover:text-[#F8F6F2]"
                      }`} style={{letterSpacing:'0.04em'}}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </nav>
            
            {/* Mobile Logout Button */}
            <div className="absolute bottom-6 left-4 right-4">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 p-3 rounded-none text-[#8A857E] hover:text-[#C6A75E] hover:bg-[#C6A75E]/5 border border-transparent hover:border-[#C6A75E]/15 transition-all duration-400 group"
              >
                <FaSignOutAlt className="text-base" />
                <div className="text-left flex-1">
                  <div className="text-xs tracking-wide text-[#8A857E] group-hover:text-[#C6A75E]" style={{letterSpacing:'0.04em'}}>
                    Logout
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 flex">
        {/* Desktop Sidebar */}
        <DashboardSidebar 
          activeSection={activeSection} 
          setActiveSection={setActiveSection}
        />

        {/* Main Content */}
        <main className="flex-1 md:ml-64">
          {/* Header */}
          <header className="bg-black/40 backdrop-blur-2xl border-b border-[#C6A75E]/10 px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden p-2 text-[#8A857E] hover:text-[#C6A75E] hover:bg-[#C6A75E]/5 rounded-lg transition-all duration-400"
                  title="Open menu"
                >
                  <FaBars className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-base md:text-xl text-[#F8F6F2]" style={{fontFamily:'var(--font-display,Georgia,serif)',fontWeight:300,letterSpacing:'0.04em'}}>
                    {activeSection === "analytics" && "Analytics Dashboard"}
                    {activeSection === "contacts" && "Contact Management"}
                    {activeSection === "teams" && "Team & Workspace"}
                    {activeSection === "transactions" && "Advanced Transactions"}
                    {activeSection === "transaction-history" && "Transaction History"}
                    {activeSection === "security" && "Security & Risk"}
                    {activeSection === "sharing" && "Sharing & Integration"}
                    {activeSection === "chat" && "AI Chat Assistant"}
                    {activeSection === "notifications" && "Notifications"}
                    {activeSection === "contractScanner" && "Contract Scanner"}
                    {activeSection === "monitoring" && "Contract Monitoring"}
                    {activeSection === "anomaly" && "Anomaly Detection"}
                    {activeSection === "multichain" && "Multi-Chain Wallet"}
                    {activeSection === "policies" && "Security Policies"}
                    {activeSection === "defi" && "DeFi Strategies"}
                  </h1>
                  <p className="text-[#8A857E] text-xs mt-1 hidden md:block" style={{letterSpacing:'0.02em'}}>
                    {activeSection === "analytics" && "Track your spending patterns and portfolio performance"}
                    {activeSection === "contacts" && "Manage your address book and contact groups"}
                    {activeSection === "teams" && "Create teams and manage group transactions"}
                    {activeSection === "transactions" && "Schedule payments and create conditional transactions"}
                    {activeSection === "transaction-history" && "View and search your transaction history"}
                    {activeSection === "security" && "Assess risks and validate transactions"}
                    {activeSection === "sharing" && "Share transactions and generate receipts"}
                    {activeSection === "chat" && "Chat with ChainPilot AI to manage your transactions"}
                    {activeSection === "notifications" && "Manage your notifications and subscriptions"}
                    {activeSection === "contractScanner" && "Analyze smart contracts for security vulnerabilities"}
                    {activeSection === "monitoring" && "Monitor contracts for suspicious activity"}
                    {activeSection === "anomaly" && "AI-powered proactive threat detection for your wallet"}
                    {activeSection === "multichain" && "View balances across all supported blockchain networks"}
                    {activeSection === "policies" && "Custom rules to protect your wallet transactions"}
                    {activeSection === "defi" && "Explore yield farming, staking, and DeFi opportunities"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Notifications */}
                <button 
                  onClick={() => setActiveSection("notifications")}
                  className="relative p-3 bg-transparent backdrop-blur-xl border border-[#C6A75E]/15 rounded-xl hover:border-[#C6A75E]/40 hover:bg-[#C6A75E]/5 transition-all duration-500"
                  title="Notifications"
                >
                  <FaBell className="text-[#8A857E] lg:flex hidden text-base hover:text-[#C6A75E]" />
                  {/* Notification count badge */}
                  <span className="absolute -top-1 -right-1 bg-red-900/60 text-red-300 text-xs rounded-full h-5 w-5 flex items-center justify-center" style={{fontSize:'0.6rem'}}>
                    0
                  </span>
                </button>

                {/* User Info */}
                <div className="flex items-center gap-3 bg-transparent backdrop-blur-xl border border-[#C6A75E]/15 rounded-xl px-4 py-2">
                  <div className="w-8 h-8 bg-[#C6A75E]/10 border border-[#C6A75E]/20 rounded-full flex items-center justify-center">
                    <span className="text-[#C6A75E] text-xs" style={{fontFamily:'var(--font-display,Georgia,serif)',fontWeight:400}}>
                      {user?.wallet?.address?.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="text-[#F8F6F2] text-xs" style={{letterSpacing:'0.03em'}}>
                      {user?.wallet?.address?.slice(0, 6)}...{user?.wallet?.address?.slice(-4)}
                    </div>
                    <div className="text-[#4A4641] text-xs uppercase" style={{fontSize:'0.6rem',letterSpacing:'0.1em'}}>Connected</div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <div className="p-4 md:p-6">
            {renderActiveSection()}
          </div>
        </main>
      </div>
    </div>
  );
}

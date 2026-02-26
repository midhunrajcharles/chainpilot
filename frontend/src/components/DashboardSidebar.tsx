"use client";
import { useLogout } from "@privy-io/react-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaBell, FaChartLine, FaHistory, FaLeaf, FaQrcode, FaRobot, FaShieldAlt, FaSignOutAlt, FaUsers, FaWallet } from "react-icons/fa";
import { Shield, Radar, Globe, TriangleAlert } from "lucide-react";

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

interface DashboardSidebarProps {
  activeSection: DashboardSection;
  setActiveSection: (section: DashboardSection) => void;
}

interface MenuCategory {
  title: string;
  items: {
    id: DashboardSection;
    label: string;
    icon: React.ReactNode;
  }[];
}

export default function DashboardSidebar({ activeSection, setActiveSection }: DashboardSidebarProps) {
  const router = useRouter();
  const { logout } = useLogout({
    onSuccess: () => {
      console.log('User successfully logged out');
      router.push("/");
    }
  });

  const menuCategories: MenuCategory[] = [
    {
      title: "Overview",
      items: [
        {
          id: "analytics" as DashboardSection,
          label: "Analytics",
          icon: <FaChartLine className="text-lg" />
        },
        {
          id: "chat" as DashboardSection,
          label: "AI Chat",
          icon: <FaRobot className="text-lg" />
        }
      ]
    },
    {
      title: "Transactions",
      items: [
        {
          id: "transactions" as DashboardSection,
          label: "Send",
          icon: <FaWallet className="text-lg" />
        },
        {
          id: "transaction-history" as DashboardSection,
          label: "History",
          icon: <FaHistory className="text-lg" />
        }
      ]
    },
    {
      title: "Contacts & Teams",
      items: [
        {
          id: "contacts" as DashboardSection,
          label: "Contacts",
          icon: <FaUsers className="text-lg" />
        },
        {
          id: "teams" as DashboardSection,
          label: "Teams",
          icon: <FaUsers className="text-lg" />
        }
      ]
    },
    {
      title: "Security",
      items: [
        {
          id: "contractScanner" as DashboardSection,
          label: "Contract Scanner",
          icon: <Shield className="h-5 w-5" />
        },
        {
          id: "monitoring" as DashboardSection,
          label: "Monitoring",
          icon: <Radar className="h-5 w-5" />
        },
        {
          id: "anomaly" as DashboardSection,
          label: "Anomaly Detector",
          icon: <TriangleAlert className="h-5 w-5" />
        },
        {
          id: "policies" as DashboardSection,
          label: "Security Policies",
          icon: <FaShieldAlt className="text-lg" />
        }
      ]
    },
    {
      title: "DeFi & Multi-Chain",
      items: [
        {
          id: "multichain" as DashboardSection,
          label: "Multi-Chain Wallet",
          icon: <Globe className="h-5 w-5" />
        },
        {
          id: "defi" as DashboardSection,
          label: "DeFi Strategies",
          icon: <FaLeaf className="text-lg" />
        }
      ]
    },
    {
      title: "Tools",
      items: [
        {
          id: "security" as DashboardSection,
          label: "Security",
          icon: <FaShieldAlt className="text-lg" />
        },
        {
          id: "sharing" as DashboardSection,
          label: "Sharing",
          icon: <FaQrcode className="text-lg" />
        },
        {
          id: "notifications" as DashboardSection,
          label: "Notifications",
          icon: <FaBell className="text-lg" />
        }
      ]
    }
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-black/30 backdrop-blur-2xl border-r border-[#C6A75E]/8 z-50 hidden md:flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[#C6A75E]/8 flex-shrink-0">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-transparent border border-[#C6A75E]/30 rounded-xl flex items-center justify-center">
            <FaRobot className="text-[#C6A75E] text-lg" />
          </div>
          <div>
            <h2 className="text-base text-[#F8F6F2] tracking-widest" style={{fontFamily:'var(--font-display,Georgia,serif)',fontWeight:300}}>
              ChainPilot AI
            </h2>
            <p className="text-[#8A857E] text-xs tracking-wider" style={{letterSpacing:'0.1em',textTransform:'uppercase',fontSize:'0.6rem'}}>Dashboard</p>
          </div>
        </Link>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {menuCategories.map((category, categoryIndex) => (
          <div key={categoryIndex}>
            {/* Category Title */}
            <div className="px-3 mb-3">
              <h3 className="text-[#4A4641] uppercase" style={{fontSize:'0.6rem',letterSpacing:'0.18em',fontWeight:400}}>
                {category.title}
              </h3>
            </div>
            
            {/* Category Items */}
            <div className="space-y-1">
              {category.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none transition-all duration-400 group ${
                    activeSection === item.id
                      ? "bg-[#C6A75E]/8 border-l-2 border-[#C6A75E] text-[#F8F6F2] pl-2"
                      : "text-[#8A857E] hover:text-[#F8F6F2] hover:bg-[#C6A75E]/5 border-l-2 border-transparent"
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
        ))}
      </nav>
      
      {/* Logout Button - Fixed at bottom */}
      <div className="p-4 border-t border-[#C6A75E]/8 flex-shrink-0">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-[#8A857E] hover:text-[#C6A75E] hover:bg-[#C6A75E]/5 transition-all duration-400 group border-l-2 border-transparent hover:border-[#C6A75E]/40"
        >
          <FaSignOutAlt className="text-base" />
          <span className="text-xs tracking-wide group-hover:text-[#C6A75E]" style={{letterSpacing:'0.04em'}}>
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}

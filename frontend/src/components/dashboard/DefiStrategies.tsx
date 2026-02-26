"use client";
import { useState } from "react";
import {
  FaArrowRight,
  FaBalanceScale,
  FaChartLine,
  FaCoins,
  FaExternalLinkAlt,
  FaInfoCircle,
  FaLeaf,
  FaLock,
  FaQuestion,
  FaRocket,
  FaWater,
} from "react-icons/fa";

interface Strategy {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  apy: string;
  risk: "Very Low" | "Low" | "Medium" | "High" | "Very High";
  riskColor: string;
  description: string;
  protocols: string[];
  pros: string[];
  cons: string[];
  links: { label: string; url: string }[];
}

const STRATEGIES: Strategy[] = [
  {
    id: "lending",
    icon: <FaLock />,
    title: "Lending / Borrowing",
    subtitle: "Earn interest by supplying assets",
    apy: "1–12% APY",
    risk: "Low",
    riskColor: "text-green-400",
    description:
      "Supply tokens to money markets and earn interest from borrowers. Your collateral stays in smart contracts and you receive a token representing your deposit.",
    protocols: ["Aave v3", "Compound v3", "Spark Protocol", "Morpho"],
    pros: ["Stable, predictable yield", "No impermanent loss", "Withdraw anytime", "Battle-tested protocols"],
    cons: ["Lower yields vs LPs", "Smart contract risk", "Interest rate fluctuations"],
    links: [
      { label: "Aave", url: "https://app.aave.com" },
      { label: "Compound", url: "https://app.compound.finance" },
    ],
  },
  {
    id: "staking",
    icon: <FaCoins />,
    title: "ETH Staking",
    subtitle: "Secure Ethereum & earn rewards",
    apy: "3.5–5% APY",
    risk: "Low",
    riskColor: "text-green-400",
    description:
      "Stake ETH to help validate the Ethereum network and earn staking rewards. Liquid staking options (Lido, RocketPool) give you tradable tokens while your ETH is staked.",
    protocols: ["Lido (stETH)", "Rocket Pool (rETH)", "Coinbase (cbETH)", "Frax (sfrxETH)"],
    pros: ["Supports network security", "Liquid staking = no lock-up", "Compounding rewards"],
    cons: ["Slashing risk (validator error)", "Lock-up period for native staking", "Liquid staking protocol risk"],
    links: [
      { label: "Lido", url: "https://stake.lido.fi" },
      { label: "Rocket Pool", url: "https://rocketpool.net" },
    ],
  },
  {
    id: "lp",
    icon: <FaWater />,
    title: "Liquidity Pools",
    subtitle: "Earn trading fees as a market maker",
    apy: "5–80%+ APY",
    risk: "Medium",
    riskColor: "text-yellow-400",
    description:
      "Deposit two tokens in equal value to a DEX liquidity pool. Earn a share of trading fees paid by every swap. V3 concentrated liquidity can amplify returns significantly.",
    protocols: ["Uniswap v3", "Curve Finance", "Balancer", "Velodrome (L2)"],
    pros: ["High potential yields", "Earn from every swap", "Incentive tokens (bonus rewards)"],
    cons: ["Impermanent loss risk", "Requires active management (v3)", "Gas cost to manage positions"],
    links: [
      { label: "Uniswap", url: "https://app.uniswap.org" },
      { label: "Curve", url: "https://curve.fi" },
    ],
  },
  {
    id: "yield-farming",
    icon: <FaLeaf />,
    title: "Yield Farming",
    subtitle: "Stack protocol incentive rewards",
    apy: "10–300%+ APY",
    risk: "High",
    riskColor: "text-orange-400",
    description:
      "Stake LP tokens or protocol tokens to earn additional reward emissions (often in the protocol's native token). High yields but token inflation can erode gains.",
    protocols: ["Convex Finance", "Yearn Finance", "Pendle", "Beefy Finance"],
    pros: ["Very high potential yields", "Auto-compounding options (Yearn/Beefy)", "Diversified exposure"],
    cons: ["Token price risk (rewards may dump)", "Complex interactions = higher contract risk", "Impermanent loss still applies"],
    links: [
      { label: "Yearn", url: "https://yearn.fi" },
      { label: "Convex", url: "https://convexfinance.com" },
      { label: "Beefy", url: "https://beefy.com" },
    ],
  },
  {
    id: "arbitrage",
    icon: <FaBalanceScale />,
    title: "Arbitrage",
    subtitle: "Exploit price differences across DEXes",
    apy: "Variable",
    risk: "Very High",
    riskColor: "text-red-400",
    description:
      "Buy an asset cheaply on one exchange and sell at a higher price on another. Requires speed, capital, and automation. Flash loans allow zero-capital strategies but are complex.",
    protocols: ["1inch", "Flashbots", "MEV-Boost", "Across Protocol"],
    pros: ["Market-neutral strategy", "Can profit in any condition", "Flash loans = no capital required"],
    cons: ["MEV bots compete aggressively", "Requires programming knowledge", "High gas costs eat margins", "Extreme complexity"],
    links: [
      { label: "1inch", url: "https://1inch.io" },
      { label: "Flashbots", url: "https://flashbots.net" },
    ],
  },
  {
    id: "perps",
    icon: <FaChartLine />,
    title: "Perpetuals & Derivatives",
    subtitle: "Leverage trading without expiry",
    apy: "Variable (trading)",
    risk: "Very High",
    riskColor: "text-red-400",
    description:
      "Trade crypto perpetual futures with leverage. Alternatively, earn funding rates by being the opposite side of a leveraged position (delta-neutral strategies).",
    protocols: ["dYdX", "GMX", "Synthetix", "Hyperliquid"],
    pros: ["Hedge your spot portfolio", "Earn funding rates (delta-neutral)", "High leverage available"],
    cons: ["Liquidation risk", "Funding rate can flip negative", "Complex strategies for beginners"],
    links: [
      { label: "GMX", url: "https://gmx.io" },
      { label: "dYdX", url: "https://dydx.exchange" },
    ],
  },
];

const RISK_ORDER = ["Very Low", "Low", "Medium", "High", "Very High"];

const RISK_BADGE: Record<string, string> = {
  "Very Low": "bg-green-500/20 border-green-500/30 text-green-400",
  "Low": "bg-emerald-500/20 border-emerald-500/30 text-emerald-400",
  "Medium": "bg-yellow-500/20 border-yellow-500/30 text-yellow-400",
  "High": "bg-orange-500/20 border-orange-500/30 text-orange-400",
  "Very High": "bg-red-500/20 border-red-500/30 text-red-400",
};

export default function DefiStrategies() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<string>("all");

  const filteredStrategies = STRATEGIES.filter((s) => {
    if (filterRisk !== "all" && s.risk !== filterRisk) return false;
    return true;
  });

  const selected = selectedId ? STRATEGIES.find((s) => s.id === selectedId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">DeFi Strategies</h2>
        <p className="text-slate-400 text-sm mt-1">
          Explore yield generation strategies from conservative to advanced
        </p>
      </div>

      {/* Risk Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-slate-400 text-sm">Filter by risk:</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterRisk("all")}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
              filterRisk === "all"
                ? "bg-white/10 border-white/20 text-white"
                : "bg-white/3 border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            All
          </button>
          {RISK_ORDER.map((r) => (
            <button
              key={r}
              onClick={() => setFilterRisk(r === filterRisk ? "all" : r)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                filterRisk === r ? RISK_BADGE[r] : "bg-white/3 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Strategy Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStrategies.map((strategy) => (
          <button
            key={strategy.id}
            onClick={() => setSelectedId(strategy.id === selectedId ? null : strategy.id)}
            className={`text-left bg-white/5 border rounded-2xl p-5 transition-all duration-300 hover:bg-white/8 ${
              selectedId === strategy.id ? "border-white/30 bg-white/8 ring-1 ring-white/20" : "border-white/10"
            }`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-transparent border border-[#C6A75E]/20 rounded-xl flex items-center justify-center text-[#C6A75E] text-lg flex-shrink-0">
                {strategy.icon}
              </div>
              <div>
                <div className="text-white font-semibold">{strategy.title}</div>
                <div className="text-slate-400 text-xs mt-0.5">{strategy.subtitle}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white text-sm font-bold">{strategy.apy}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${RISK_BADGE[strategy.risk]}`}>
                {strategy.risk} Risk
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {strategy.protocols.slice(0, 3).map((p) => (
                <span key={p} className="text-xs px-2 py-0.5 bg-white/5 border border-white/10 rounded-lg text-slate-400">
                  {p}
                </span>
              ))}
              {strategy.protocols.length > 3 && (
                <span className="text-xs px-2 py-0.5 bg-white/5 border border-white/10 rounded-lg text-slate-500">
                  +{strategy.protocols.length - 3}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 mt-3 text-xs text-blue-400">
              <FaInfoCircle />
              <span>{selectedId === strategy.id ? "Hide details" : "View details"}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
          {/* Title */}
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-transparent border border-[#C6A75E]/20 rounded-xl flex items-center justify-center text-[#C6A75E] text-xl flex-shrink-0">
              {selected.icon}
            </div>
            <div>
              <h3 className="text-white font-bold text-xl">{selected.title}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-white font-semibold">{selected.apy}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${RISK_BADGE[selected.risk]}`}>
                  {selected.risk} Risk
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-slate-300 text-sm leading-relaxed">{selected.description}</p>

          {/* Pros / Cons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-green-400 font-semibold text-sm mb-2 flex items-center gap-1.5">
                <FaRocket /> Advantages
              </div>
              <ul className="space-y-1.5">
                {selected.pros.map((p, i) => (
                  <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                    <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span> {p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-red-400 font-semibold text-sm mb-2 flex items-center gap-1.5">
                <FaQuestion /> Risks
              </div>
              <ul className="space-y-1.5">
                {selected.cons.map((c, i) => (
                  <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Protocols */}
          <div>
            <div className="text-slate-400 text-sm font-medium mb-2">Supported Protocols</div>
            <div className="flex flex-wrap gap-2">
              {selected.protocols.map((p) => (
                <span
                  key={p}
                  className="text-sm px-3 py-1 bg-white/5 border border-white/10 rounded-xl text-slate-300"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-3">
            {selected.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#C6A75E]/8 border border-[#C6A75E]/25 text-[#C6A75E] hover:text-[#E8D5A3] hover:bg-[#C6A75E]/15 rounded-xl text-xs tracking-wider transition-all duration-400"
              >
                {link.label} <FaExternalLinkAlt className="text-xs" />
              </a>
            ))}
            <a
              href="https://defillama.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl text-sm transition-all duration-200"
            >
              Live yields on DeFiLlama <FaExternalLinkAlt className="text-xs" />
            </a>
          </div>

          {/* DeFi Chat Prompt */}
          <div className="bg-[#C6A75E]/5 border border-[#C6A75E]/15 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-1">
              <FaArrowRight /> Ask the AI
            </div>
            <p className="text-slate-400 text-sm">
              Open the AI Chat and ask:{" "}
              <span className="text-white italic">
                &ldquo;Tell me more about {selected.title.toLowerCase()} strategies&rdquo;
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

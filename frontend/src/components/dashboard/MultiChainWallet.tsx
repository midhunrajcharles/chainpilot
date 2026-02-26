"use client";
import { ChainBalance, ChainInfo, MultiChainApiClient } from "@/utils/api/multiChainApi";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { FaExternalLinkAlt, FaGlobe, FaSync } from "react-icons/fa";

// Map logo colors to Tailwind classes
function chainColorClass(color: string): string {
  const map: Record<string, string> = {
    "#627EEA": "from-blue-500/30 to-indigo-500/30 border-blue-500/30",
    "#8247E5": "from-purple-500/30 to-violet-500/30 border-purple-500/30",
    "#F0B90B": "from-yellow-500/30 to-amber-500/30 border-yellow-500/30",
    "#FF4500": "from-orange-500/30 to-red-500/30 border-orange-500/30",
    "#FF0420": "from-red-500/30 to-pink-500/30 border-red-500/30",
    "#0052FF": "from-blue-600/30 to-cyan-500/30 border-blue-500/30",
    default: "from-slate-500/30 to-slate-600/30 border-slate-500/30",
  };
  return map[color] ?? map.default;
}

export default function MultiChainWallet() {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address ?? "";

  const [chains, setChains] = useState<ChainInfo[]>([]);
  const [balances, setBalances] = useState<ChainBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [chainsLoading, setChainsLoading] = useState(false);
  const [selectedChainIds, setSelectedChainIds] = useState<Set<number>>(new Set());
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [filter, setFilter] = useState<"all" | "testnet" | "mainnet">("all");

  useEffect(() => {
    loadChains();
  }, []);

  useEffect(() => {
    if (walletAddress && chains.length) {
      loadBalances();
    }
  }, [walletAddress, chains]);

  const loadChains = async () => {
    setChainsLoading(true);
    try {
      const res = await MultiChainApiClient.getChains();
      if (res.success && res.data) {
        setChains(res.data as ChainInfo[]);
        setSelectedChainIds(new Set((res.data as ChainInfo[]).map((c) => c.chainId)));
      }
    } catch (err) {
      console.error("loadChains error:", err);
    } finally {
      setChainsLoading(false);
    }
  };

  const loadBalances = async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const chainIds = selectedChainIds.size > 0 ? Array.from(selectedChainIds) : undefined;
      const res = await MultiChainApiClient.getAllBalances(walletAddress, chainIds);
      if (res.success && res.data) {
        setBalances(res.data as ChainBalance[]);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error("loadBalances error:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleChain = (chainId: number) => {
    setSelectedChainIds((prev) => {
      const next = new Set(prev);
      if (next.has(chainId)) next.delete(chainId);
      else next.add(chainId);
      return next;
    });
  };

  const filteredChains = chains.filter((c) => {
    if (filter === "testnet") return c.isTestnet;
    if (filter === "mainnet") return !c.isTestnet;
    return true;
  });

  const activeBalances = balances.filter((b) => !b.error && parseFloat(b.balance) > 0);
  const totalActiveChains = activeBalances.length;

  const getBalanceForChain = (chainId: number) =>
    balances.find((b) => b.chainId === chainId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Multi-Chain Portfolio</h2>
          <p className="text-slate-400 text-sm mt-1">
            Cross-chain balance dashboard across {chains.length} supported networks
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-slate-500 text-xs">
              Updated {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={loadBalances}
            disabled={loading || !walletAddress}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white rounded-xl text-sm transition-all duration-200 disabled:opacity-50"
          >
            <FaSync className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      {!loading && activeBalances.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-slate-400 text-xs mb-1">Total Chains</div>
            <div className="text-white font-bold text-2xl">{chains.length}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-slate-400 text-xs mb-1">Active (non-zero)</div>
            <div className="text-green-400 font-bold text-2xl">{totalActiveChains}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-slate-400 text-xs mb-1">Zero Balance</div>
            <div className="text-slate-400 font-bold text-2xl">{balances.length - totalActiveChains}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-slate-400 text-xs mb-1">Errors</div>
            <div className="text-red-400 font-bold text-2xl">{balances.filter((b) => b.error).length}</div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-slate-400 text-sm">Show:</span>
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
          {(["all", "mainnet", "testnet"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
                filter === f ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="text-slate-500 text-xs ml-auto">
          {filteredChains.length} network{filteredChains.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Chain Grid */}
      {chainsLoading ? (
        <div className="flex items-center justify-center py-16">
          <FaSync className="text-slate-400 text-2xl animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChains.map((chain) => {
            const bal = getBalanceForChain(chain.chainId);
            const isSelected = selectedChainIds.has(chain.chainId);
            const hasBalance = bal && !bal.error && parseFloat(bal.balance) > 0;
            const colorClass = chainColorClass(chain.logoColor);

            return (
              <div
                key={chain.chainId}
                className={`relative border rounded-2xl p-5 transition-all duration-300 ${
                  isSelected ? "" : "opacity-50"
                } bg-gradient-to-br border ${colorClass}`}
              >
                {/* Chain Name + Toggle */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{chain.name}</span>
                      {chain.isTestnet && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-400 border border-white/10">
                          Testnet
                        </span>
                      )}
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">{chain.nativeCurrency.symbol} · Chain {chain.chainId}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isSelected}
                      onChange={() => toggleChain(chain.chainId)}
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-checked:bg-blue-500 rounded-full transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                  </label>
                </div>

                {/* Balance */}
                <div className="mt-4 min-h-[52px]">
                  {loading ? (
                    <div className="flex items-center gap-2 text-slate-500">
                      <FaSync className="animate-spin text-sm" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  ) : bal?.error ? (
                    <div className="text-red-400 text-sm">⚠️ RPC error</div>
                  ) : bal ? (
                    <div>
                      <div className={`font-bold text-2xl ${hasBalance ? "text-white" : "text-slate-500"}`}>
                        {parseFloat(bal.balance).toFixed(6)}
                      </div>
                      <div className="text-slate-400 text-sm">{chain.nativeCurrency.symbol}</div>
                    </div>
                  ) : !walletAddress ? (
                    <div className="text-slate-500 text-sm">Connect wallet</div>
                  ) : (
                    <div className="text-slate-500 text-sm">Not loaded</div>
                  )}
                </div>

                {/* Explorer Link */}
                {walletAddress && (
                  <a
                    href={`${chain.blockExplorerUrl}/address/${walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs mt-3 transition-colors group"
                  >
                    <FaExternalLinkAlt className="text-xs" />
                    View on {chain.shortName} Explorer
                  </a>
                )}

                {/* Active indicator */}
                {hasBalance && (
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Active Balances Summary */}
      {!loading && activeBalances.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <FaGlobe className="text-blue-400" />
            <h3 className="text-white font-semibold">Active Balances Summary</h3>
          </div>
          <div className="space-y-2">
            {activeBalances.map((b) => (
              <div key={b.chainId} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-slate-300 text-sm">{b.chainName}</span>
                <div className="text-right">
                  <span className="text-white font-medium">{parseFloat(b.balance).toFixed(6)}</span>
                  <span className="text-slate-400 text-sm ml-1">{b.symbol}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

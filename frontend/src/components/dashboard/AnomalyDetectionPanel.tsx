"use client";
import { AnomalyApiClient, AnomalyEvent, AnomalyScanResult } from "@/utils/api/anomalyApi";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaSearch,
  FaShieldAlt,
  FaSyncAlt,
  FaTimesCircle,
  FaTrash,
} from "react-icons/fa";
import { toast } from "sonner";

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  critical: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: <FaTimesCircle />, label: "Critical" },
  high:     { color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", icon: <FaExclamationCircle />, label: "High" },
  medium:   { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", icon: <FaExclamationTriangle />, label: "Medium" },
  low:      { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", icon: <FaShieldAlt />, label: "Low" },
};

const RISK_DOT: Record<string, string> = {
  SAFE: "bg-green-500", LOW: "bg-blue-500", MEDIUM: "bg-yellow-500", HIGH: "bg-orange-500", CRITICAL: "bg-red-500",
};

const ANOMALY_TYPE_LABELS: Record<string, string> = {
  UNUSUAL_TRANSFER_VOLUME:   "Unusual Volume",
  RAPID_TRANSACTION_BURST:   "Rapid Burst",
  NEW_HIGH_VALUE_COUNTERPARTY: "New High-Value Address",
  DORMANT_WALLET_ACTIVATED:  "Dormant Activation",
  CIRCULAR_TRANSFER_PATTERN: "Circular Pattern",
  BLACKLISTED_COUNTERPARTY:  "Blacklisted Address",
  AFTER_HOURS_ACTIVITY:      "After-Hours Activity",
  GAS_PRICE_SPIKE:           "Gas Price Spike",
  FAILED_TX_CLUSTER:         "Failed TX Cluster",
};

export default function AnomalyDetectionPanel() {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = user?.wallet?.address || wallets?.[0]?.address || "";

  const [scanResult, setScanResult] = useState<AnomalyScanResult | null>(null);
  const [events, setEvents] = useState<AnomalyEvent[]>([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<"scan" | "events">("scan");

  useEffect(() => {
    if (walletAddress) loadEvents();
  }, [walletAddress]);

  const normalizeSeverity = (severity: string) => severity?.toLowerCase?.() || "low";
  const normalizeConfidence = (confidence: number) => (confidence > 1 ? confidence / 100 : confidence);

  const normalizeEvent = (event: AnomalyEvent): AnomalyEvent => ({
    ...event,
    severity: normalizeSeverity(event.severity) as AnomalyEvent["severity"],
    confidence: normalizeConfidence(event.confidence),
  });

  const loadEvents = async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const res = await AnomalyApiClient.getEvents(walletAddress, { limit: 50 });
      if (res.success && res.data) {
        setEvents((res.data as AnomalyEvent[]).map(normalizeEvent));
      } else {
        toast.error(res.error || "Failed to load anomaly events");
      }
    } catch (err) {
      console.error("loadEvents error:", err);
      toast.error("Failed to load anomaly events");
    } finally {
      setLoading(false);
    }
  };

  const runScan = async () => {
    if (!walletAddress) return;
    setScanning(true);
    setScanResult(null);
    try {
      const res = await AnomalyApiClient.scanWallet(walletAddress);
      if (res.success && res.data) {
        const payload = res.data as AnomalyScanResult;
        setScanResult({
          ...payload,
          anomalies: (payload.anomalies || []).map(normalizeEvent),
        });
        toast.success("Live anomaly scan completed");
        await loadEvents(); // refresh event list after scan
      } else {
        toast.error(res.error || "Anomaly scan failed");
      }
    } catch (err) {
      console.error("runScan error:", err);
      toast.error("Anomaly scan failed");
    } finally {
      setScanning(false);
    }
  };

  const acknowledgeEvent = async (id: string) => {
    if (!walletAddress) return;
    const res = await AnomalyApiClient.acknowledge(walletAddress, id);
    if (!res.success) {
      toast.error(res.error || "Failed to acknowledge event");
      return;
    }
    setEvents((prev) => prev.map((e) => (e._id === id ? { ...e, acknowledged: true } : e)));
  };

  const clearAcknowledged = async () => {
    if (!walletAddress) return;
    const res = await AnomalyApiClient.clearAcknowledged(walletAddress);
    if (!res.success) {
      toast.error(res.error || "Failed to clear acknowledged events");
      return;
    }
    setEvents((prev) => prev.filter((e) => !e.acknowledged));
  };

  const filteredEvents = events.filter((e) => {
    if (showUnreadOnly && e.acknowledged) return false;
    if (filterSeverity !== "all" && e.severity !== filterSeverity) return false;
    return true;
  });

  const unreadCount = events.filter((e) => !e.acknowledged).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Anomaly Detection</h2>
          <p className="text-slate-400 text-sm mt-1">AI-powered threat detection for your wallet</p>
          <p className="text-slate-500 text-xs mt-1">Live mode: scans on-chain RPC activity + app transaction history</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-semibold border border-red-500/30">
              {unreadCount} unread
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit">
        {(["scan", "events"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {tab === "scan" ? "🔍 Scan Wallet" : `📋 Event Log ${unreadCount > 0 ? `(${unreadCount})` : ""}`}
          </button>
        ))}
      </div>

      {/* SCAN TAB */}
      {activeTab === "scan" && (
        <div className="space-y-4">
          {/* Scan Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-transparent border border-[#C6A75E]/20 rounded-xl flex items-center justify-center">
                <FaSearch className="text-blue-400 text-xl" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold text-lg">Proactive Wallet Scan</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Analyzes your last 500 transactions using 6 AI detectors to find suspicious patterns.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {[
                { icon: "⚡", label: "Rapid Burst", desc: "8+ txs/hour" },
                { icon: "📊", label: "Unusual Volume", desc: "3× weekly spike" },
                { icon: "😴", label: "Dormant Activation", desc: "90+ day wallet" },
                { icon: "🔄", label: "Circular Transfers", desc: "A→B→A patterns" },
                { icon: "❌", label: "Failed TX Cluster", desc: "4+ fails in 2h" },
                { icon: "🌙", label: "After-Hours Activity", desc: "1–5 AM UTC" },
              ].map((det) => (
                <div key={det.label} className="bg-white/3 border border-white/5 rounded-xl p-3">
                  <div className="text-lg mb-1">{det.icon}</div>
                  <div className="text-white text-xs font-medium">{det.label}</div>
                  <div className="text-slate-500 text-xs">{det.desc}</div>
                </div>
              ))}
            </div>

            <button
              onClick={runScan}
              disabled={scanning || !walletAddress}
              className="w-full py-3 bg-transparent border border-[#C6A75E]/40 hover:bg-[#C6A75E]/10 hover:border-[#C6A75E] disabled:opacity-40 disabled:cursor-not-allowed text-[#C6A75E] tracking-widest uppercase rounded-none transition-all duration-500 flex items-center justify-center gap-2 text-xs"
            >
              {scanning ? (
                <>
                  <FaSyncAlt className="animate-spin" /> Scanning...
                </>
              ) : (
                <>
                  <FaSearch /> Run Anomaly Scan
                </>
              )}
            </button>
          </div>

          {/* Scan Results */}
          {scanResult && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-3 h-3 rounded-full ${RISK_DOT[scanResult.overallRisk] ?? "bg-slate-400"}`} />
                <h3 className="text-white font-semibold">
                  Scan Result: <span className="text-slate-300">{scanResult.overallRisk}</span>
                </h3>
                <span className="ml-auto text-slate-500 text-xs">
                  {scanResult.newAnomaliesFound} new issue{scanResult.newAnomaliesFound !== 1 ? "s" : ""} found
                </span>
              </div>

              {(scanResult.transactionsAnalyzed !== undefined || scanResult.dataSources) && (
                <div className="text-xs text-slate-500 border border-white/10 bg-white/5 rounded-lg px-3 py-2">
                  {scanResult.transactionsAnalyzed !== undefined && (
                    <span>Transactions analyzed: {scanResult.transactionsAnalyzed}</span>
                  )}
                  {scanResult.dataSources && (
                    <span>
                      {scanResult.transactionsAnalyzed !== undefined ? ' • ' : ''}
                      Sources — RPC: {scanResult.dataSources.onchainTransactions}, DB: {scanResult.dataSources.dbTransactions}
                    </span>
                  )}
                </div>
              )}

              {scanResult.anomalies.length === 0 ? (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <FaCheckCircle className="text-green-400 text-xl flex-shrink-0" />
                  <div>
                    <div className="text-green-400 font-medium">All Clear</div>
                    <div className="text-slate-400 text-sm">No suspicious activity detected in your wallet.</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {scanResult.anomalies.map((a) => {
                    const cfg = SEVERITY_CONFIG[a.severity] ?? SEVERITY_CONFIG.low;
                    return (
                      <div key={a._id} className={`border rounded-xl p-4 ${cfg.bg}`}>
                        <div className="flex items-start gap-3">
                          <span className={`${cfg.color} text-lg flex-shrink-0 mt-0.5`}>{cfg.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white font-medium text-sm">{a.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                                {cfg.label}
                              </span>
                              <span className="text-slate-500 text-xs ml-auto">
                                {ANOMALY_TYPE_LABELS[a.type] ?? a.type}
                              </span>
                            </div>
                            <p className="text-slate-400 text-sm mt-1">{a.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-slate-500 text-xs">
                                Confidence: {(a.confidence * 100).toFixed(0)}%
                              </span>
                              <span className="text-slate-500 text-xs">
                                Risk Score: {a.riskScore}/100
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* EVENTS TAB */}
      {activeTab === "events" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <input
                id="unread"
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="accent-blue-500"
              />
              <label htmlFor="unread" className="text-slate-300 text-sm cursor-pointer">
                Unread only
              </label>
            </div>

            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-white/5 border border-white/10 text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-white/30"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <button
              onClick={loadEvents}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white rounded-xl text-sm transition-all duration-200"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} /> Refresh
            </button>

            {events.some((e) => e.acknowledged) && (
              <button
                onClick={clearAcknowledged}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl text-sm transition-all duration-200 ml-auto"
              >
                <FaTrash /> Clear Acknowledged
              </button>
            )}
          </div>

          {/* Event List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <FaSyncAlt className="text-slate-400 text-2xl animate-spin" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-16">
              <FaCheckCircle className="text-green-500 text-4xl mx-auto mb-3" />
              <p className="text-white font-medium">No events found</p>
              <p className="text-slate-400 text-sm mt-1">Run a scan to detect anomalies.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => {
                const cfg = SEVERITY_CONFIG[event.severity] ?? SEVERITY_CONFIG.low;
                return (
                  <div
                    key={event._id}
                    className={`border rounded-2xl p-4 transition-all duration-200 ${
                      event.acknowledged ? "opacity-60" : ""
                    } ${cfg.bg}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`${cfg.color} text-lg flex-shrink-0 mt-0.5`}>{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium text-sm">{event.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          {event.acknowledged && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400">
                              Acknowledged
                            </span>
                          )}
                          <span className="text-slate-500 text-xs ml-auto">
                            {new Date(event.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm mt-1">{event.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-slate-500 text-xs">
                            Confidence: {(event.confidence * 100).toFixed(0)}%
                          </span>
                          <span className="text-slate-500 text-xs">
                            Risk: {event.riskScore}/100
                          </span>
                          {!event.acknowledged && (
                            <button
                              onClick={() => acknowledgeEvent(event._id)}
                              className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                            >
                              <FaCheckCircle /> Acknowledge
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

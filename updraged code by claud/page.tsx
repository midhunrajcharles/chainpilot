'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Search, Loader2, ExternalLink, Lock, Unlock, BarChart3 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import RiskMeter from '@/components/RiskMeter';
import FlagBreakdown from '@/components/FlagBreakdown';
import AIExplanationPanel from '@/components/AIExplanationPanel';
import { analyzeContract, AnalysisResponse } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CHAIN_OPTIONS = [
  { id: 1, name: 'Ethereum Mainnet' },
  { id: 137, name: 'Polygon' },
  { id: 56, name: 'BSC' },
  { id: 43114, name: 'Avalanche' },
];

export default function DashboardPage() {
  const [address, setAddress] = useState('');
  const [chainId, setChainId] = useState(1);
  const [logOnChain, setLogOnChain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse['data'] | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Please enter a valid Ethereum contract address');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await analyzeContract({ address, chainId, logOnChain });
      setResult(response.data);
      setReportId(response.reportId);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const scoreChartData = result
    ? Object.entries(result.scoreBreakdown || {}).map(([flag, score]) => ({
        name: flag.replace(/_/g, ' ').slice(0, 18),
        score,
      }))
    : [];

  return (
    <div className="flex min-h-screen bg-dark-950 grid-bg">
      <Sidebar />

      <main className="ml-64 flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/25 flex items-center justify-center">
                <Shield size={20} className="text-brand-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Smart Contract Risk Analyzer</h1>
                <p className="text-sm text-slate-500">AI-powered vulnerability detection & scoring</p>
              </div>
            </div>
          </motion.div>

          {/* Input Panel */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6 mb-6"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Contract Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-dark-900 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-600 font-mono text-sm focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/20 transition-all"
                />
              </div>

              <div className="w-full md:w-52">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Network
                </label>
                <select
                  value={chainId}
                  onChange={(e) => setChainId(Number(e.target.value))}
                  className="w-full bg-dark-900 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-500/60 transition-all"
                >
                  {CHAIN_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div
                  onClick={() => setLogOnChain(!logOnChain)}
                  className={`w-10 h-5 rounded-full transition-all ${logOnChain ? 'bg-brand-500' : 'bg-slate-700'} relative`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${logOnChain ? 'left-5.5' : 'left-0.5'}`} />
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-400">
                  {logOnChain ? <Lock size={13} className="text-brand-500" /> : <Unlock size={13} />}
                  Immutable on-chain audit log
                </div>
              </label>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAnalyze}
                disabled={loading}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-all"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Analyzing...</>
                ) : (
                  <><Search size={16} /> Analyze Contract</>
                )}
              </motion.button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}
          </motion.div>

          {/* Results */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                {/* Left: Risk Meter + Meta */}
                <div className="lg:col-span-1 space-y-5">
                  <div className="glass rounded-2xl p-6 flex flex-col items-center">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 self-start">
                      Risk Score
                    </div>
                    <RiskMeter score={result.riskScore} severity={result.severity} />

                    <div className="w-full mt-6 space-y-2.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Chain</span>
                        <span className="text-white font-mono">{result.chainId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Verified</span>
                        <span className={result.verified ? 'text-green-400' : 'text-red-400'}>
                          {result.verified ? '✓ Yes' : '✗ No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Bytecode Size</span>
                        <span className="text-white font-mono">{result.metadata?.bytecodeSize} bytes</span>
                      </div>
                    </div>
                  </div>

                  {/* Score Chart */}
                  {scoreChartData.length > 0 && (
                    <div className="glass rounded-2xl p-5">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <BarChart3 size={13} /> Score Breakdown
                      </div>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={scoreChartData} layout="vertical" margin={{ left: 0, right: 10 }}>
                          <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
                          <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} width={90} />
                          <Tooltip
                            contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8 }}
                            labelStyle={{ color: '#f1f5f9', fontSize: 12 }}
                          />
                          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                            {scoreChartData.map((_, i) => (
                              <Cell key={i} fill="#0ea5e9" fillOpacity={0.7} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Middle: Flags */}
                <div className="lg:col-span-1 glass rounded-2xl p-6">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                    Vulnerability Flags ({result.flags?.length || 0})
                  </div>
                  <FlagBreakdown findings={result.technicalFindings || []} />
                </div>

                {/* Right: AI Panel */}
                <div className="lg:col-span-1 glass rounded-2xl p-6">
                  <AIExplanationPanel explanation={result.aiExplanation} />

                  {result.onChainLog?.txHash && (
                    <motion.a
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      href={result.onChainLog.verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 mt-5 text-xs text-brand-500 hover:text-brand-400 transition-colors"
                    >
                      <ExternalLink size={12} />
                      View on-chain audit proof
                    </motion.a>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

/**
 * Contract Scanner Page
 * Main interface for smart contract security analysis
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Shield, ExternalLink } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';
import RiskMeter from './RiskMeter';
import FlagBreakdown from './FlagBreakdown';
import AIExplanationPanel from './AIExplanationPanel';
import { analyzeContract, ContractAnalysisResponse } from '../../utils/api/contractAnalysisApi';

export default function ContractScanner() {
  const { user } = usePrivy();
  const [contractAddress, setContractAddress] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ContractAnalysisResponse['data'] | null>(null);
  
  const handleAnalyze = async () => {
    if (!contractAddress.trim()) {
      toast.error('Please enter a contract address');
      return;
    }
    
    if (!user?.wallet?.address) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      const response = await analyzeContract({
        contractAddress: contractAddress.trim(),
        userAddress: user.wallet.address,
        chainId: 11155111, // Sepolia testnet
      });
      
      if (response.success && response.data) {
        setAnalysisResult(response.data);
        toast.success('Contract analysis complete!');
      } else {
        toast.error(response.error || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Failed to analyze contract');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  return (
    <div className="min-h-screen p-6 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Contract Security Scanner
          </h1>
        </div>
        <p className="text-gray-400 max-w-2xl mx-auto">
          AI-powered smart contract vulnerability analysis using GPT-4o and bytecode inspection
        </p>
      </motion.div>
      
      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl mx-auto"
      >
        <div className="relative">
          <input
            type="text"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
            placeholder="Enter contract address (0x...)"
            className="w-full px-6 py-4 pr-32 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            disabled={isAnalyzing}
          />
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl font-semibold text-white hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Analyze
              </>
            )}
          </button>
        </div>
      </motion.div>
      
      {/* Analysis Results */}
      <AnimatePresence mode="wait">
        {analysisResult && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-7xl mx-auto space-y-8"
          >
            {/* Contract Info Card */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Contract Information
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Address:</span>
                      <span className="text-white font-mono">{analysisResult.contractAddress}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Chain:</span>
                      <span className="text-white">Somnia Testnet</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Source Code:</span>
                      <span className={analysisResult.isVerified ? 'text-green-500' : 'text-yellow-500'}>
                        {analysisResult.isVerified ? 'Verified ✓' : 'Unverified'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {analysisResult.auditLog.explorerUrl && (
                  <a
                    href={analysisResult.auditLog.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors flex items-center gap-2 text-sm"
                  >
                    View on Explorer
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
            
            {/* Risk Meter and Summary */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex items-center justify-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <RiskMeter
                  riskScore={analysisResult.riskScore}
                  severity={analysisResult.severity}
                  size={220}
                />
              </div>
              
              <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-6">
                <h3 className="text-xl font-semibold text-white">Summary</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="text-3xl font-bold text-red-500">
                      {analysisResult.summary.criticalCount}
                    </div>
                    <div className="text-sm text-gray-400">Critical</div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                    <div className="text-3xl font-bold text-orange-500">
                      {analysisResult.summary.highCount}
                    </div>
                    <div className="text-sm text-gray-400">High</div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <div className="text-3xl font-bold text-yellow-500">
                      {analysisResult.summary.mediumCount}
                    </div>
                    <div className="text-sm text-gray-400">Medium</div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <div className="text-3xl font-bold text-green-500">
                      {analysisResult.summary.lowCount}
                    </div>
                    <div className="text-sm text-gray-400">Low</div>
                  </div>
                </div>
                
                {analysisResult.auditLog.isVerifiedOnChain && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Audit logged on-chain</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Flag Breakdown */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <FlagBreakdown flags={analysisResult.flagBreakdown} />
            </div>
            
            {/* AI Explanation */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <AIExplanationPanel explanation={analysisResult.aiExplanation} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

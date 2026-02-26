/**
 * AI Explanation Panel Component
 * Displays GPT-4o powered security analysis explanation
 */

'use client';

import { motion } from 'framer-motion';
import { Brain, Shield, AlertTriangle, Lightbulb, FileText } from 'lucide-react';
import { AIAnalysis } from '@/types/security';

interface AIExplanationPanelProps {
  explanation: AIAnalysis;
}

const VERDICT_CONFIG = {
  SAFE: {
    icon: Shield,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500',
    label: 'Safe to Interact',
  },
  CAUTION: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500',
    label: 'Proceed with Caution',
  },
  DANGER: {
    icon: AlertTriangle,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500',
    label: 'High Risk - Avoid',
  },
  CRITICAL: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500',
    label: 'CRITICAL - Do Not Interact',
  },
};

export default function AIExplanationPanel({ explanation }: AIExplanationPanelProps) {
  const config = VERDICT_CONFIG[explanation.verdict];
  const VerdictIcon = config.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header with AI branding */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
          <Brain className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white">
            AI Security Analysis
          </h3>
          <p className="text-sm text-gray-400">Powered by GPT-4o</p>
        </div>
      </div>
      
      {/* Verdict Banner */}
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
        className={`
          relative overflow-hidden rounded-xl border-2 ${config.border}
          ${config.bg} p-6
        `}
      >
        <div className="relative z-10 flex items-center gap-4">
          <VerdictIcon className={`w-8 h-8 ${config.color}`} />
          <div className="flex-1">
            <div className={`text-sm font-semibold ${config.color} uppercase mb-1`}>
              Verdict
            </div>
            <div className="text-2xl font-bold text-white">
              {config.label}
            </div>
          </div>
        </div>
        
        {/* Animated background gradient */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at 100% 0%, ${config.color}, transparent 50%)`,
          } as React.CSSProperties}
        >
          <motion.div
            className="absolute inset-0"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      </motion.div>
      
      {/* Explanation Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold">
          <FileText className="w-5 h-5 text-blue-400" />
          <span>Explanation</span>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <p className="text-gray-300 leading-relaxed">
            {explanation.explanation}
          </p>
        </div>
      </div>
      
      {/* Recommendation Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          <span>Recommended Action</span>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <p className="text-gray-300 leading-relaxed">
            {explanation.recommendation}
          </p>
        </div>
      </div>
      
      {/* Technical Summary (Collapsible) */}
      <details className="group">
        <summary className="cursor-pointer list-none">
          <div className="flex items-center gap-2 text-white font-semibold p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <Shield className="w-5 h-5 text-purple-400" />
            <span>Technical Summary</span>
            <div className="ml-auto">
              <svg
                className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ transformOrigin: 'center' } as React.CSSProperties}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </summary>
        
        <div className="mt-2 p-4 rounded-xl bg-black/20 border border-white/10">
          <pre className="text-sm text-gray-400 whitespace-pre-wrap font-mono">
            {explanation.technicalSummary}
          </pre>
        </div>
      </details>
      
      {/* Disclaimer */}
      <div className="text-xs text-gray-500 p-3 rounded-lg bg-white/5 border border-white/10">
        <strong>Disclaimer:</strong> This analysis is AI-generated and should not be considered as financial or security advice. Always conduct your own research and consult with security professionals before interacting with smart contracts.
      </div>
    </motion.div>
  );
}

/**
 * Flag Breakdown Component
 * Displays detected vulnerability flags as cards
 */

'use client';

import { motion } from 'framer-motion';
import { Shield, AlertTriangle, AlertOctagon, XCircle, CheckCircle } from 'lucide-react';
import { VulnerabilityFlag } from '@/types/security';

interface FlagBreakdownProps {
  flags: VulnerabilityFlag[];
}

const SEVERITY_CONFIG = {
  LOW: {
    icon: CheckCircle,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  MEDIUM: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
  },
  HIGH: {
    icon: AlertOctagon,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  CRITICAL: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
};

function formatFlagName(flag: string): string {
  return flag
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

export default function FlagBreakdown({ flags }: FlagBreakdownProps) {
  if (flags.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 mx-auto text-green-500 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          No Vulnerabilities Detected
        </h3>
        <p className="text-gray-400">
          This contract passed all automated security checks
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">
        Detected Vulnerabilities ({flags.length})
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {flags.map((flag, index) => {
          const config = SEVERITY_CONFIG[flag.severity];
          const Icon = config.icon;
          
          return (
            <motion.div
              key={flag.flag}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                relative overflow-hidden rounded-xl border ${config.border}
                ${config.bg} backdrop-blur-sm p-4
                hover:scale-[1.02] transition-transform duration-200
              `}
            >
              {/* Severity badge */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${config.color}`} />
                  <span className={`text-xs font-semibold ${config.color} uppercase`}>
                    {flag.severity}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">Weight:</span>
                  <span className={`text-sm font-bold ${config.color}`}>
                    {flag.weight}
                  </span>
                </div>
              </div>
              
              {/* Flag name */}
              <h4 className="text-white font-semibold mb-2">
                {formatFlagName(flag.flag)}
              </h4>
              
              {/* Description */}
              <p className="text-sm text-gray-300 leading-relaxed">
                {flag.description}
              </p>
              
              {/* Weight bar */}
              <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className={config.bg}
                  initial={{ width: 0 }}
                  animate={{ width: `${(flag.weight / 25) * 100}%` }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.6 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

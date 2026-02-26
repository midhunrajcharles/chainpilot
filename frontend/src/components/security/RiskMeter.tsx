/**
 * Risk Meter Component
 * Circular gauge visualization for contract risk scores
 */

'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { SeverityLevel } from '@/types/security';

interface RiskMeterProps {
  riskScore: number; // 0-100
  severity: SeverityLevel;
  size?: number;
  showLabel?: boolean;
}

const SEVERITY_COLORS = {
  LOW: {
    stroke: '#10b981', // green
    bg: 'rgba(16, 185, 129, 0.1)',
    text: 'text-green-500',
  },
  MEDIUM: {
    stroke: '#f59e0b', // yellow/orange
    bg: 'rgba(245, 158, 11, 0.1)',
    text: 'text-yellow-500',
  },
  HIGH: {
    stroke: '#f97316', // orange
    bg: 'rgba(249, 115, 22, 0.1)',
    text: 'text-orange-500',
  },
  CRITICAL: {
    stroke: '#ef4444', // red
    bg: 'rgba(239, 68, 68, 0.1)',
    text: 'text-red-500',
  },
};

export default function RiskMeter({
  riskScore,
  severity,
  size = 200,
  showLabel = true,
}: RiskMeterProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  const colors = SEVERITY_COLORS[severity];
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;
  
  useEffect(() => {
    // Animate score on mount
    const duration = 1500; // ms
    const steps = 60;
    const increment = riskScore / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= riskScore) {
        setAnimatedScore(riskScore);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [riskScore]);
  
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative"
        style={{ width: `${size}px`, height: `${size}px` } as React.CSSProperties}
      >
        {/* Background circle */}
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="12"
            fill="none"
          />
          
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.stroke}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className={`text-5xl font-bold ${colors.text}`}
          >
            {animatedScore}
          </motion.div>
          <div className="text-sm text-gray-400 mt-1">Risk Score</div>
        </div>
        
        {/* Pulsing glow effect for high risk */}
        {(severity === 'HIGH' || severity === 'CRITICAL') && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${colors.stroke}40 0%, transparent 70%)`,
            } as React.CSSProperties}
          >
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [0.95, 1.05, 0.95],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>
        )}
      </motion.div>
      
      {showLabel && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col items-center gap-2"
        >
          <div
            className={`px-4 py-2 rounded-full font-semibold text-sm ${colors.text}`}
            style={{ backgroundColor: colors.bg }}
          >
            {severity} RISK
          </div>
          
          <div className="text-xs text-gray-500 text-center max-w-xs">
            {severity === 'LOW' && 'Contract appears relatively safe'}
            {severity === 'MEDIUM' && 'Proceed with caution'}
            {severity === 'HIGH' && 'Significant risks detected'}
            {severity === 'CRITICAL' && 'DO NOT INTERACT - Critical vulnerabilities found'}
          </div>
        </motion.div>
      )}
    </div>
  );
}

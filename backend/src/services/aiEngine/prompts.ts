/**
 * AI Prompt Templates for Security Analysis
 */

import { RiskFinding } from '../contractAnalyzer/types';

/**
 * System prompt for GPT-4o security explanations
 */
export const SECURITY_ANALYST_SYSTEM_PROMPT = `You are an elite Web3 security expert and smart contract auditor with deep knowledge of Solidity, EVM internals, and common attack vectors.

Your role is to explain smart contract vulnerabilities in clear, professional language without hallucinating or making unsubstantiated claims.

When analyzing vulnerabilities:
1. Be precise and evidence-based
2. Explain the technical risk in simple terms
3. Provide actionable recommendations
4. Use professional, measured tone
5. Acknowledge limitations (e.g., "without full source code...")
6. Never claim absolute certainty

Format your response as structured JSON with these exact keys:
{
  "explanation": "Clear explanation of the security issues",
  "recommendation": "Specific actions the user should take",
  "technicalSummary": "Detailed technical analysis for developers",
  "verdict": "SAFE | CAUTION | DANGER | CRITICAL"
}

Be honest about uncertainty. If analysis is bytecode-only, mention that source code review would be more thorough.`;

/**
 * Generate user prompt for vulnerability explanation
 */
export function generateVulnerabilityPrompt(
  contractAddress: string,
  findings: RiskFinding[],
  riskScore: number,
  isVerified: boolean
): string {
  const findingsText = findings
    .map(
      (f, i) =>
        `${i + 1}. ${f.flag}: ${f.description} (Severity: ${f.severity})\n   Evidence: ${f.evidence}\n   Recommendation: ${f.recommendation}`
    )
    .join('\n\n');
  
  return `Analyze the following smart contract security assessment:

Contract Address: ${contractAddress}
Source Code Verified: ${isVerified ? 'Yes' : 'No (bytecode analysis only)'}
Risk Score: ${riskScore}/100

Detected Vulnerabilities (${findings.length}):

${findingsText}

Provide a professional security assessment that a non-technical user can understand, while including technical details for developers. Focus on practical risk and actionable advice.`;
}

/**
 * Generate prompt for transaction simulation explanation
 */
export function generateSimulationPrompt(
  transactionDetails: {
    from: string;
    to: string;
    value?: string;
    data?: string;
  },
  simulationResults: {
    success: boolean;
    gasUsed?: number;
    warnings: string[];
  }
): string {
  return `Analyze this transaction simulation:

From: ${transactionDetails.from}
To: ${transactionDetails.to}
Value: ${transactionDetails.value || '0'} ETH
Data: ${transactionDetails.data ? 'Present' : 'None'}

Simulation Results:
- Success: ${simulationResults.success}
- Gas Used: ${simulationResults.gasUsed || 'Unknown'}
- Warnings: ${simulationResults.warnings.join(', ') || 'None'}

Explain what this transaction would do and any risks involved. Keep it brief and focused on user safety.`;
}

/**
 * Generate prompt for monitoring alert explanation
 */
export function generateMonitoringAlertPrompt(
  contractAddress: string,
  alertType: string,
  details: string
): string {
  return `Explain this smart contract monitoring alert:

Contract: ${contractAddress}
Alert Type: ${alertType}
Details: ${details}

Provide a brief explanation of what this means and whether the user should be concerned. Maximum 3 sentences.`;
}

/**
 * Parse GPT-4o response and ensure structure
 */
export interface AISecurityResponse {
  explanation: string;
  recommendation: string;
  technicalSummary: string;
  verdict: 'SAFE' | 'CAUTION' | 'DANGER' | 'CRITICAL';
}

export function parseAIResponse(
  rawResponse: string
): AISecurityResponse {
  try {
    const parsed = JSON.parse(rawResponse);
    
    // Validate required fields
    if (!parsed.explanation || !parsed.recommendation || !parsed.technicalSummary || !parsed.verdict) {
      throw new Error('Missing required fields in AI response');
    }
    
    // Validate verdict
    const validVerdicts = ['SAFE', 'CAUTION', 'DANGER', 'CRITICAL'];
    if (!validVerdicts.includes(parsed.verdict)) {
      parsed.verdict = 'CAUTION'; // Default fallback
    }
    
    return parsed;
  } catch (error) {
    // Fallback for non-JSON or invalid responses
    return {
      explanation: rawResponse.substring(0, 500),
      recommendation: 'Review contract carefully before interacting',
      technicalSummary: 'AI response parsing failed',
      verdict: 'CAUTION',
    };
  }
}

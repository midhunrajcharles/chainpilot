/**
 * AI Engine Service
 * GPT-4o integration for security vulnerability explanations
 */

import OpenAI from 'openai';
import { RiskFinding } from '../contractAnalyzer/types';
import {
  SECURITY_ANALYST_SYSTEM_PROMPT,
  generateVulnerabilityPrompt,
  generateSimulationPrompt,
  generateMonitoringAlertPrompt,
  parseAIResponse,
  AISecurityResponse,
} from './prompts';

// Initialize OpenAI client with API key rotation
class AIEngine {
  private clients: OpenAI[];
  private currentKeyIndex: number = 0;
  private maxRetries: number = 3;
  
  constructor() {
    const apiKeys = this.getApiKeys();
    this.clients = apiKeys.map((key) => new OpenAI({ apiKey: key }));

    if (this.clients.length === 0) {
      console.warn('⚠️  No OpenAI API keys configured – AI analysis will use built-in fallback mode');
    }
  }
  
  /**
   * Get API keys from environment (supports multiple keys)
   */
  private getApiKeys(): string[] {
    const keys: string[] = [];
    
    // Primary key
    if (process.env.OPENAI_API_KEY) {
      keys.push(process.env.OPENAI_API_KEY);
    }
    
    // Additional keys (OPENAI_API_KEY_2, OPENAI_API_KEY_3, etc.)
    for (let i = 2; i <= 5; i++) {
      const key = process.env[`OPENAI_API_KEY_${i}`];
      if (key) keys.push(key);
    }
    
    return keys;
  }
  
  /**
   * Get next client (round-robin key rotation)
   */
  private getNextClient(): OpenAI {
    const client = this.clients[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.clients.length;
    return client;
  }
  
  /**
   * Call GPT-4o with retry logic
   */
  private async callGPT4o(
    systemPrompt: string,
    userPrompt: string,
    temperature: number = 0.3
  ): Promise<string> {
    if (this.clients.length === 0) {
      throw new Error('AI service not configured');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const client = this.getNextClient();
        
        const response = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          response_format: { type: 'json_object' },
          max_tokens: 1500,
        });
        
        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from GPT-4o');
        }
        
        return content;
      } catch (error: any) {
        console.error(`GPT-4o attempt ${attempt + 1} failed:`, error.message);
        lastError = error;
        
        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }
    
    throw new Error(`GPT-4o failed after ${this.maxRetries} attempts: ${lastError?.message}`);
  }
  
  /**
   * Explain contract vulnerabilities
   */
  async explainVulnerabilities(
    contractAddress: string,
    findings: RiskFinding[],
    riskScore: number,
    isVerified: boolean
  ): Promise<AISecurityResponse> {
    try {
      const userPrompt = generateVulnerabilityPrompt(
        contractAddress,
        findings,
        riskScore,
        isVerified
      );
      
      const rawResponse = await this.callGPT4o(
        SECURITY_ANALYST_SYSTEM_PROMPT,
        userPrompt,
        0.3 // Low temperature for consistent security analysis
      );
      
      return parseAIResponse(rawResponse);
    } catch (error: any) {
      console.error('AI vulnerability explanation failed:', error);
      
      // Graceful fallback
      return this.generateFallbackResponse(findings, riskScore);
    }
  }
  
  /**
   * Explain transaction simulation results
   */
  async explainSimulation(
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
  ): Promise<{ explanation: string; risk: string }> {
    try {
      const userPrompt = generateSimulationPrompt(
        transactionDetails,
        simulationResults
      );
      
      const rawResponse = await this.callGPT4o(
        SECURITY_ANALYST_SYSTEM_PROMPT,
        userPrompt,
        0.4
      );
      
      const parsed = JSON.parse(rawResponse);
      return {
        explanation: parsed.explanation || rawResponse,
        risk: parsed.verdict || 'CAUTION',
      };
    } catch (error) {
      return {
        explanation: simulationResults.success
          ? 'Transaction simulation completed successfully.'
          : 'Transaction simulation failed. Do not proceed.',
        risk: simulationResults.success ? 'CAUTION' : 'DANGER',
      };
    }
  }
  
  /**
   * Explain monitoring alert
   */
  async explainAlert(
    contractAddress: string,
    alertType: string,
    details: string
  ): Promise<string> {
    try {
      const userPrompt = generateMonitoringAlertPrompt(
        contractAddress,
        alertType,
        details
      );
      
      const rawResponse = await this.callGPT4o(
        SECURITY_ANALYST_SYSTEM_PROMPT,
        userPrompt,
        0.5
      );
      
      const parsed = JSON.parse(rawResponse);
      return parsed.explanation || rawResponse;
    } catch (error) {
      return `Alert: ${alertType} detected for contract ${contractAddress}. ${details}`;
    }
  }
  
  /**
   * Generate fallback response when AI is unavailable
   */
  private generateFallbackResponse(
    findings: RiskFinding[],
    riskScore: number
  ): AISecurityResponse {
    const criticalCount = findings.filter(
      (f) => f.severity === 'CRITICAL'
    ).length;
    const highCount = findings.filter((f) => f.severity === 'HIGH').length;
    
    let verdict: 'SAFE' | 'CAUTION' | 'DANGER' | 'CRITICAL' = 'SAFE';
    if (riskScore >= 70) verdict = 'CRITICAL';
    else if (riskScore >= 45) verdict = 'DANGER';
    else if (riskScore >= 20) verdict = 'CAUTION';
    
    const explanation =
      findings.length === 0
        ? 'No significant vulnerabilities detected in automated analysis.'
        : `Analysis detected ${findings.length} potential security issue(s) including ${criticalCount} critical and ${highCount} high severity findings. Risk score: ${riskScore}/100.`;
    
    const recommendation =
      riskScore >= 70
        ? 'DO NOT INTERACT with this contract. Multiple critical vulnerabilities detected.'
        : riskScore >= 45
        ? 'Exercise extreme caution. Review all findings before interacting.'
        : riskScore >= 20
        ? 'Proceed with caution and verify contract legitimacy.'
        : 'Contract appears relatively safe, but always verify before large transactions.';
    
    const technicalSummary = findings
      .map((f) => `${f.flag}: ${f.description}`)
      .join('; ');
    
    return {
      explanation,
      recommendation,
      technicalSummary: technicalSummary || 'No technical issues detected.',
      verdict,
    };
  }
}

// Export singleton instance
export const aiEngine = new AIEngine();

// Export functions for convenience
export async function explainVulnerabilities(
  contractAddress: string,
  findings: RiskFinding[],
  riskScore: number,
  isVerified: boolean
): Promise<AISecurityResponse> {
  return aiEngine.explainVulnerabilities(
    contractAddress,
    findings,
    riskScore,
    isVerified
  );
}

export async function explainSimulation(
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
): Promise<{ explanation: string; risk: string }> {
  return aiEngine.explainSimulation(transactionDetails, simulationResults);
}

export async function explainAlert(
  contractAddress: string,
  alertType: string,
  details: string
): Promise<string> {
  return aiEngine.explainAlert(contractAddress, alertType, details);
}

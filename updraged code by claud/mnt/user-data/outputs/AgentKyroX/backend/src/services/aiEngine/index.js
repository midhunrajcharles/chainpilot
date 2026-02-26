/**
 * AI Engine
 * Generates human-readable, professional security explanations from risk findings.
 * Uses OpenAI GPT-4 with strict output structure.
 */

const OpenAI = require('openai');
const { logger } = require('../../utils/logger');

let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

const SYSTEM_PROMPT = `You are ChainPilot AI, an elite Web3 smart contract security analyst. 
You receive structured risk findings from a static analysis engine and produce professional, 
accurate security reports. 

Rules:
- Never hallucinate or invent vulnerabilities not in the input data
- Use precise security terminology
- Be direct and actionable
- Structure output EXACTLY as JSON with fields: summary, warnings, recommendations, technicalDetail, riskNarrative
- Tone: Professional investigator, not alarming but serious
- Each warnings item: { flag, explanation, severity, impact }
- Each recommendation: string`;

/**
 * Generate AI explanation for a risk report.
 * @param {object} riskReport - Output from riskEngine.evaluateContractRisk
 * @returns {Promise<AIExplanation>}
 */
async function generateRiskExplanation(riskReport) {
  const client = getOpenAIClient();

  const userContent = `
Analyze this smart contract risk report and generate a structured security assessment:

Contract: ${riskReport.address}
Chain ID: ${riskReport.chainId}
Risk Score: ${riskReport.riskScore}/100
Severity: ${riskReport.severity}
Source Verified: ${riskReport.verified}

Detected Flags:
${riskReport.flags.map((f) => `- ${f}`).join('\n')}

Technical Findings:
${riskReport.technicalFindings.map((f) => `- [${f.flag}] ${f.description} (source: ${f.source})`).join('\n')}

Score Breakdown:
${Object.entries(riskReport.scoreBreakdown || {}).map(([k, v]) => `- ${k}: ${v} pts`).join('\n')}

Return a JSON object with exactly these fields:
{
  "summary": "2-3 sentence executive summary",
  "riskNarrative": "Detailed paragraph explaining the overall risk profile",
  "warnings": [
    {
      "flag": "FLAG_NAME",
      "explanation": "What this means and why it is dangerous",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "impact": "What could happen if exploited"
    }
  ],
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2"
  ],
  "technicalDetail": "Deep-dive technical paragraph for security engineers",
  "verdict": "SAFE|CAUTION|AVOID|CRITICAL_RISK"
}`;

  logger.info(`[AIEngine] Generating explanation for ${riskReport.address}`);

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    temperature: 0.2, // Low temperature for deterministic, factual output
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0].message.content;

  try {
    const parsed = JSON.parse(raw);
    logger.info(`[AIEngine] Explanation generated. Verdict: ${parsed.verdict}`);
    return {
      ...parsed,
      modelUsed: response.model,
      tokensUsed: response.usage?.total_tokens,
    };
  } catch (parseErr) {
    logger.error('[AIEngine] Failed to parse AI response:', parseErr);
    throw new Error('AI response parsing failed — raw output was not valid JSON');
  }
}

/**
 * Generate AI explanation for a transaction simulation result.
 */
async function explainSimulationResult(simulationResult, contractAddress) {
  const client = getOpenAIClient();

  const userContent = `
A transaction simulation was run for contract ${contractAddress}. 
Explain these results clearly to a non-technical user while noting any dangers:

Simulation Status: ${simulationResult.simulationStatus}
Gas Estimate: ${simulationResult.gasEstimate}
Warnings: ${simulationResult.warnings.join(', ') || 'None'}
Asset Impact: ${JSON.stringify(simulationResult.assetImpact)}

Return JSON with:
{
  "plain_explanation": "Simple 2-sentence explanation",
  "danger_level": "SAFE|WARNING|DANGER",
  "user_action": "What the user should do next",
  "gas_insight": "Is the gas estimate normal or abnormal?"
}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    temperature: 0.1,
    max_tokens: 600,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}

module.exports = { generateRiskExplanation, explainSimulationResult };

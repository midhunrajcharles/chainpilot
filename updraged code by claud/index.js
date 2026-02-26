/**
 * Contract Analyzer Service
 * Fetches on-chain contract data and runs static risk checks.
 */

const { ethers } = require('ethers');
const axios = require('axios');
const { logger } = require('../../utils/logger');

// ─── RPC Provider Factory ─────────────────────────────────────────────────────
function getProvider(rpcUrl) {
  return new ethers.JsonRpcProvider(rpcUrl || process.env.DEFAULT_RPC_URL);
}

// ─── Bytecode Fetch ───────────────────────────────────────────────────────────
async function fetchContractBytecode(address, rpcUrl) {
  const provider = getProvider(rpcUrl);
  const code = await provider.getCode(address);
  if (code === '0x') throw new Error('No contract found at this address');
  return code;
}

// ─── ABI Fetch (Etherscan-compatible) ────────────────────────────────────────
async function fetchContractABI(address, chainId = 1) {
  const explorerApis = {
    1: `https://api.etherscan.io/api`,
    137: `https://api.polygonscan.com/api`,
    56: `https://api.bscscan.com/api`,
    43114: `https://api.snowtrace.io/api`,
  };

  const baseUrl = explorerApis[chainId];
  if (!baseUrl) return { abi: null, verified: false };

  const apiKey = process.env.EXPLORER_API_KEY || '';
  try {
    const { data } = await axios.get(baseUrl, {
      params: {
        module: 'contract',
        action: 'getabi',
        address,
        apikey: apiKey,
      },
      timeout: 8000,
    });
    if (data.status === '1') {
      return { abi: JSON.parse(data.result), verified: true };
    }
    return { abi: null, verified: false };
  } catch {
    return { abi: null, verified: false };
  }
}

// ─── Source Code Fetch ────────────────────────────────────────────────────────
async function fetchSourceCode(address, chainId = 1) {
  const explorerApis = {
    1: `https://api.etherscan.io/api`,
    137: `https://api.polygonscan.com/api`,
    56: `https://api.bscscan.com/api`,
  };
  const baseUrl = explorerApis[chainId];
  if (!baseUrl) return null;
  const apiKey = process.env.EXPLORER_API_KEY || '';
  try {
    const { data } = await axios.get(baseUrl, {
      params: {
        module: 'contract',
        action: 'getsourcecode',
        address,
        apikey: apiKey,
      },
      timeout: 8000,
    });
    if (data.status === '1' && data.result[0]?.SourceCode) {
      return data.result[0].SourceCode;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Static Bytecode Checks ───────────────────────────────────────────────────

/**
 * Checks bytecode hex patterns for known vulnerability signatures.
 * Returns array of flag strings.
 */
function analyzeBytecodePatterns(bytecode) {
  const flags = [];

  // selfdestruct opcode: 0xff
  if (/ff/.test(bytecode)) {
    flags.push('SELFDESTRUCT_PRESENT');
  }

  // delegatecall opcode: 0xf4 (proxy pattern indicator)
  if (/f4/.test(bytecode)) {
    flags.push('PROXY_CONTRACT');
  }

  // CALL opcode followed by re-entry vector patterns
  // simplified heuristic: presence of 0xf1 (CALL) and 0x55 (SSTORE) in patterns
  if (/f1.{0,20}55/.test(bytecode)) {
    flags.push('REENTRANCY_PATTERN');
  }

  return flags;
}

/**
 * Checks Solidity source code for vulnerability patterns.
 * Returns array of flag strings.
 */
function analyzeSourcePatterns(sourceCode) {
  const flags = [];
  if (!sourceCode) return flags;

  const src = sourceCode.toLowerCase();

  if (/selfdestruct\s*\(/.test(src)) flags.push('SELFDESTRUCT_PRESENT');
  if (/delegatecall\s*\(/.test(src)) flags.push('PROXY_CONTRACT');

  // Reentrancy: external call before state change
  if (/\.call\{/.test(src) && !/nonreentrant/.test(src)) {
    flags.push('REENTRANCY_PATTERN');
  }

  // Owner-only drain
  if (/(onlyowner|require\s*\(.*owner)/.test(src) && /withdraw/.test(src)) {
    flags.push('OWNER_ONLY_WITHDRAW');
  }

  // Unlimited approval
  if (/approve\s*\(.*type\s*\(uint256\)\.max|approve\s*\(.*2\s*\*\*\s*256/.test(src)) {
    flags.push('UNLIMITED_APPROVAL');
  }

  // Suspicious modifier pattern: no access control
  if (/function\s+withdraw/.test(src) && !/onlyowner|modifier/.test(src)) {
    flags.push('MISSING_ACCESS_CONTROL');
  }

  // Centralized control
  if (/(transferownership|renounceownership)/.test(src)) {
    flags.push('CENTRALIZED_CONTROL');
  }

  return flags;
}

/**
 * Analyze ABI for dangerous function signatures.
 */
function analyzeABI(abi) {
  const flags = [];
  if (!abi || !Array.isArray(abi)) return flags;

  const functionNames = abi
    .filter((item) => item.type === 'function')
    .map((item) => item.name?.toLowerCase() || '');

  if (functionNames.some((n) => ['withdraw', 'drain', 'emergencywithdraw'].includes(n))) {
    flags.push('OWNER_ONLY_WITHDRAW');
  }

  // Check for unlimited approval via approve function with large uint256
  const approveFunc = abi.find(
    (item) => item.type === 'function' && item.name === 'approve'
  );
  if (approveFunc) flags.push('UNLIMITED_APPROVAL');

  return flags;
}

// ─── Main Analyzer ────────────────────────────────────────────────────────────

/**
 * Full contract analysis pipeline.
 * @param {string} address
 * @param {number} chainId
 * @param {string} rpcUrl
 * @returns {Promise<object>} Raw analysis results
 */
async function analyzeContract(address, chainId = 1, rpcUrl = null) {
  logger.info(`Analyzing contract: ${address} on chain ${chainId}`);

  const [bytecode, { abi, verified }, sourceCode] = await Promise.all([
    fetchContractBytecode(address, rpcUrl),
    fetchContractABI(address, chainId),
    fetchSourceCode(address, chainId),
  ]);

  const bytecodeFlags = analyzeBytecodePatterns(bytecode);
  const sourceFlags = sourceCode ? analyzeSourcePatterns(sourceCode) : ['UNVERIFIED_SOURCE'];
  const abiFlags = analyzeABI(abi);

  // Deduplicate flags
  const allFlags = [...new Set([...bytecodeFlags, ...sourceFlags, ...abiFlags])];

  const findings = allFlags.map((flag) => ({
    flag,
    source: bytecodeFlags.includes(flag)
      ? 'bytecode'
      : sourceFlags.includes(flag)
      ? 'source'
      : 'abi',
    description: getFlagDescription(flag),
  }));

  return {
    address,
    chainId,
    verified,
    bytecodeSize: bytecode.length / 2,
    hasSourceCode: !!sourceCode,
    flags: allFlags,
    findings,
    rawBytecodeSnippet: bytecode.slice(0, 100) + '...',
  };
}

function getFlagDescription(flag) {
  const descriptions = {
    SELFDESTRUCT_PRESENT: 'Contract contains selfdestruct opcode — owner can permanently destroy contract and drain funds.',
    PROXY_CONTRACT: 'Contract uses delegatecall — implementation can be swapped, changing behavior silently.',
    REENTRANCY_PATTERN: 'External calls detected without reentrancy guard — vulnerable to reentrancy attacks.',
    OWNER_ONLY_WITHDRAW: 'Owner can withdraw all funds unilaterally — centralized fund control risk.',
    UNLIMITED_APPROVAL: 'Contract may request unlimited ERC-20 approval — single breach drains entire wallet allowance.',
    UNVERIFIED_SOURCE: 'Contract source code is not verified on-chain explorer — cannot audit Solidity logic.',
    MISSING_ACCESS_CONTROL: 'Withdraw function found without access control modifier.',
    CENTRALIZED_CONTROL: 'Ownership transfer functions detected — single point of failure for control.',
    SUSPICIOUS_MODIFIER: 'Non-standard modifier patterns detected that may bypass security checks.',
    PRICE_MANIPULATION_RISK: 'Single-block price oracle usage detected — susceptible to flash loan manipulation.',
  };
  return descriptions[flag] || 'Unknown risk pattern detected.';
}

module.exports = {
  analyzeContract,
  fetchContractBytecode,
  fetchContractABI,
  fetchSourceCode,
};

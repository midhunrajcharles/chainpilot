/**
 * Contract Analysis Patterns
 * Bytecode opcodes and source code patterns for vulnerability detection
 */

// Bytecode opcode patterns (hex strings without 0x prefix)
export const BYTECODE_PATTERNS = {
  // SELFDESTRUCT opcode (0xff)
  SELFDESTRUCT: /ff[0-9a-f]{0,40}/i,
  
  // DELEGATECALL opcode (0xf4)
  DELEGATECALL: /f4[0-9a-f]{0,40}/i,
  
  // CALLCODE opcode (0xf2) - deprecated but still dangerous
  CALLCODE: /f2[0-9a-f]{0,40}/i,
  
  // CREATE2 opcode (0xf5) - can be used for proxy patterns
  CREATE2: /f5[0-9a-f]{0,40}/i,
  
  // CALL opcode (0xf1) followed by SLOAD (0x54) - potential reentrancy
  CALL_SLOAD: /f1.{0,100}54/i,
  
  // TX.ORIGIN usage (0x32)
  TX_ORIGIN: /32[0-9a-f]{0,20}/i,
};

// Source code regex patterns for Solidity
export const SOURCE_CODE_PATTERNS = {
  // Reentrancy patterns
  EXTERNAL_CALL_BEFORE_STATE: /\.call\{.*?\}.*?(?=;)[\s\S]{0,200}(?:balance|_balance|amount)\s*=/i,
  
  // Timestamp dependencies
  TIMESTAMP_DEPENDENCY: /block\.timestamp|now\s*[<>=]/i,
  
  // Owner-only withdraw patterns
  OWNER_WITHDRAW: /function\s+withdraw.*?onlyOwner|function\s+emergencyWithdraw.*?onlyOwner/i,
  
  // Unlimited approval
  UNLIMITED_APPROVAL: /approve\s*\([^,]+,\s*(2\*\*256|type\(uint256\)\.max|-1)\)/i,
  
  // Missing access control
  MISSING_MODIFIER: /function\s+(withdraw|transferFunds|emergencyWithdraw|destroy|kill)\s*\([^)]*\)\s*(?:external|public)\s*{/i,
  
  // Suspicious modifiers (hidden admin functions)
  SUSPICIOUS_MODIFIER: /modifier\s+\w*[Aa]dmin\w*|modifier\s+\w*[Oo]wner\w*|modifier\s+\w*[Pp]rivileged\w*/i,
  
  // Price manipulation risks (oracle dependencies)
  PRICE_ORACLE: /getPrice|oracle|price\s*=.*?\.latestAnswer/i,
  
  // Centralized control patterns
  CENTRALIZED_CONTROL: /onlyOwner|onlyAdmin|requireOwner|_owner\s*==|msg\.sender\s*==\s*owner/gi,
  
  // TX.ORIGIN authentication (dangerous)
  TX_ORIGIN_AUTH: /tx\.origin\s*==|require\s*\(\s*tx\.origin/i,
  
  // Flash loan patterns
  FLASH_LOAN: /flashLoan|flash\s*loan|borrow.*repay|loan.*callback/i,
  
  // Unchecked external calls
  UNCHECKED_CALL: /\.call\{[^}]*\}[^;]*;(?!\s*require)/i,
};

// ABI function signatures that indicate risk
export const RISKY_FUNCTION_SIGNATURES = [
  'withdraw',
  'emergencyWithdraw',
  'drain',
  'sweep',
  'transferOwnership',
  'renounceOwnership',
  'selfdestruct',
  'destroy',
  'kill',
  'upgradeTo',
  'upgradeToAndCall',
  'setImplementation',
  'pause',
  'unpause',
  'changeAdmin',
  'setAdmin',
  'mint',
  'burn',
];

// Known vulnerable contract patterns (bytecode hashes)
export const KNOWN_VULNERABLE_PATTERNS = [
  // Add known malicious bytecode hashes here
  // These would be maintained in a database in production
];

export interface PatternMatch {
  pattern: string;
  matched: boolean;
  evidence?: string;
  location?: string;
}

/**
 * Detect patterns in bytecode
 */
export function detectBytecodePatterns(bytecode: string): Record<string, PatternMatch> {
  const cleanBytecode = bytecode.replace(/^0x/, '');
  
  const results: Record<string, PatternMatch> = {};
  
  for (const [name, pattern] of Object.entries(BYTECODE_PATTERNS)) {
    const match = cleanBytecode.match(pattern);
    results[name] = {
      pattern: name,
      matched: !!match,
      evidence: match ? match[0] : undefined,
    };
  }
  
  return results;
}

/**
 * Detect patterns in source code
 */
export function detectSourcePatterns(sourceCode: string): Record<string, PatternMatch> {
  const results: Record<string, PatternMatch> = {};
  
  for (const [name, pattern] of Object.entries(SOURCE_CODE_PATTERNS)) {
    const match = sourceCode.match(pattern);
    results[name] = {
      pattern: name,
      matched: !!match,
      evidence: match ? match[0].substring(0, 100) : undefined,
    };
  }
  
  return results;
}

/**
 * Check ABI for risky functions
 */
export function detectRiskyFunctions(abi: any[]): string[] {
  if (!abi || !Array.isArray(abi)) return [];
  
  const riskyFunctions: string[] = [];
  
  for (const item of abi) {
    if (item.type === 'function' && item.name) {
      const funcName = item.name.toLowerCase();
      
      for (const riskyName of RISKY_FUNCTION_SIGNATURES) {
        if (funcName.includes(riskyName.toLowerCase())) {
          riskyFunctions.push(item.name);
          break;
        }
      }
    }
  }
  
  return riskyFunctions;
}

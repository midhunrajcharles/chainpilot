# ChainPilot AI — Autonomous Web3 Security Agent

> **AI-powered smart contract risk analysis, transaction simulation, and autonomous on-chain monitoring.**
> Built for Web3 professionals who can't afford to guess.

---

## 🚨 Problem Statement

Over **$3.8 billion** was lost to smart contract exploits in 2023 alone. The core problem:

- Users blindly approve transactions without understanding what they're signing
- Contract audits are expensive ($20k–$100k) and not accessible to retail users
- No real-time autonomous monitoring for deployed contracts
- Exploit investigations are manual, slow, and hard to verify

**ChainPilot AI** solves all four problems in one autonomous AI agent.

---

## 🧠 Solution Overview

ChainPilot AI is an **AI-native Web3 security platform** that:

1. **Analyzes** smart contracts for vulnerabilities using static bytecode + source analysis
2. **Explains** findings in plain English using GPT-4o
3. **Simulates** transactions before you sign them
4. **Monitors** contracts autonomously and alerts on suspicious activity
5. **Logs** AI audit decisions immutably on-chain for verification

---

## 🏗 Architecture

```
ChainPilotAI/
├── backend/
│   └── src/
│       ├── services/
│       │   ├── contractAnalyzer/   # Bytecode + source code static analysis
│       │   ├── riskEngine/         # Weighted scoring orchestrator
│       │   ├── aiEngine/           # GPT-4o explanation layer
│       │   ├── transactionSimulator/ # Pre-execution risk preview
│       │   ├── blockchainLogger/   # On-chain hash submission
│       │   └── monitoringEngine/   # Event listeners + cron jobs
│       ├── utils/
│       │   ├── scoring.js          # RISK_WEIGHTS + severity thresholds
│       │   └── logger.js           # Winston structured logging
│       ├── routes/                 # Thin API handlers (no business logic)
│       ├── models/                 # AuditReport, Monitor, Alert schemas
│       └── middleware/             # Rate limiting, error handling, validation
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── dashboard/          # Contract Risk Analyzer UI
│       │   ├── simulate/           # Transaction Preview UI
│       │   ├── monitor/            # Autonomous Monitor Panel
│       │   └── audit/              # On-chain Audit Log UI
│       ├── components/
│       │   ├── RiskMeter.tsx       # SVG circular gauge
│       │   ├── FlagBreakdown.tsx   # Vulnerability cards
│       │   └── AIExplanationPanel.tsx # GPT verdict UI
│       └── lib/api.ts              # Typed API client
└── contracts/
    └── AuditLog.sol                # Immutable on-chain audit registry
```

---

## ⚙️ How It Works

### Contract Risk Analyzer

```
Input: Contract address + chain ID
  ↓
Fetch bytecode via JSON-RPC
Fetch ABI + source via Explorer API
  ↓
Static analysis:
  - Bytecode pattern matching (selfdestruct, delegatecall, reentrancy)
  - Solidity source scanning (owner-only withdraw, unlimited approval, etc.)
  - ABI function signature analysis
  ↓
Risk scoring engine (weighted sum → capped at 100)
  ↓
GPT-4o explanation generation (deterministic, structured JSON)
  ↓
Optional: hash report → submit to AuditLog.sol → return TX proof
```

### Risk Scoring Weights

| Flag | Weight |
|------|--------|
| REENTRANCY_PATTERN | 25 |
| SELFDESTRUCT_PRESENT | 20 |
| PRICE_MANIPULATION_RISK | 22 |
| UNLIMITED_APPROVAL | 18 |
| MISSING_ACCESS_CONTROL | 16 |
| OWNER_ONLY_WITHDRAW | 15 |
| SUSPICIOUS_MODIFIER | 14 |
| CENTRALIZED_CONTROL | 13 |
| PROXY_CONTRACT | 12 |
| UNVERIFIED_SOURCE | 10 |

### Severity Thresholds
- **CRITICAL**: ≥ 70
- **HIGH**: ≥ 45
- **MEDIUM**: ≥ 20
- **LOW**: < 20

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- OpenAI API key
- Alchemy / Infura RPC URL
- Etherscan API key (for verified source fetch)

### Backend

```bash
cd backend
cp .env.example .env
# Fill in MONGODB_URI, OPENAI_API_KEY, DEFAULT_RPC_URL, EXPLORER_API_KEY
npm install
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
# Set NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
npm install
npm run dev
```

### Smart Contract (Optional, for on-chain logging)

```bash
# Deploy AuditLog.sol on your preferred network using Hardhat/Foundry
# Pass your backend wallet address as constructor argument: trustedLogger
# Set AUDIT_CONTRACT_ADDRESS + LOGGER_PRIVATE_KEY in backend .env
```

---

## 📡 API Reference

### POST /api/v1/analyze
Analyze a smart contract for vulnerabilities.

**Request:**
```json
{
  "address": "0xContractAddress",
  "chainId": 1,
  "logOnChain": false
}
```

**Response:**
```json
{
  "success": true,
  "reportId": "...",
  "data": {
    "riskScore": 72,
    "severity": "CRITICAL",
    "flags": ["REENTRANCY_PATTERN", "SELFDESTRUCT_PRESENT"],
    "technicalFindings": [...],
    "aiExplanation": {
      "verdict": "CRITICAL_RISK",
      "summary": "...",
      "recommendations": [...]
    }
  }
}
```

### POST /api/v1/simulate
Simulate a transaction before signing.

**Request:**
```json
{
  "from": "0xYourWallet",
  "to": "0xContract",
  "value": "1.5",
  "data": "0x095ea7b3..."
}
```

**Response:**
```json
{
  "simulationStatus": "SUCCESS",
  "gasEstimate": "42000",
  "warnings": ["UNLIMITED_APPROVAL: ..."],
  "assetImpact": { "ethDelta": "-1.5 ETH", ... },
  "aiExplanation": { "danger_level": "DANGER", "user_action": "..." }
}
```

### POST /api/v1/monitor
Start autonomous contract monitoring.

### GET /api/v1/monitor
List all monitors.

### DELETE /api/v1/monitor/:id
Stop a monitor.

### GET /api/v1/audit/recent
Get recent audit reports.

### GET /api/v1/audit/stats
Get aggregate statistics.

---

## 🔒 Smart Contract: AuditLog.sol

The `AuditLog` contract stores SHA-256 hashes of AI security reports immutably.

**Key properties:**
- Only the trusted backend wallet (`trustedLogger`) can submit entries
- Entries cannot be modified or deleted
- Each entry stores: reportHash, contractAudited, initiator address, timestamp, severity
- `verifyAudit(hash)` function for public proof verification

**Events emitted:**
```solidity
event AuditLogged(
  bytes32 indexed reportHash,
  address indexed contractAudited,
  address indexed initiator,
  uint256 timestamp,
  uint8 severity
);
```

---

## 🛡 Security

- Input validation on all routes via `express-validator`
- Rate limiting: 100 req/15min global, 10 req/min on analysis endpoints
- Helmet.js security headers
- No secrets exposed to frontend
- OpenAI responses constrained with `response_format: json_object`
- Logging middleware for full audit trail

---

## 🗺 Future Roadmap

- [ ] MEV bot detection patterns
- [ ] Flash loan attack simulation
- [ ] Multi-sig wallet integration
- [ ] Telegram/Discord alert webhooks
- [ ] Historical exploit database matching
- [ ] Cross-chain monitoring (all EVM chains)
- [ ] Browser extension for real-time dApp protection
- [ ] Team collaboration dashboard
- [ ] Formal verification integration

---

## 🎯 Demo Script (3 minutes)

**[0:00–0:30] Hook**
"$3.8 billion lost to smart contract hacks in 2023. Every single one could have been prevented with the right tools. This is ChainPilot AI."

**[0:30–1:15] Contract Analysis Demo**
- Paste a known risky contract address
- Watch the risk meter animate to CRITICAL (72/100)
- Show flags: REENTRANCY_PATTERN, SELFDESTRUCT_PRESENT
- Read the GPT-4o verdict: "CRITICAL_RISK — do not interact"

**[1:15–1:45] Transaction Simulation Demo**
- Paste a transaction with unlimited approval calldata
- Show the warning: "UNLIMITED_APPROVAL: Grants full access to your token balance"
- AI says: "DANGER — reject this transaction"

**[1:45–2:15] Live Monitor Demo**
- Add a contract to monitoring
- Show the cron system checking risk scores every 15 minutes
- Trigger an alert for large transfer

**[2:15–2:45] On-Chain Audit Proof**
- Show the immutable blockchain log TX
- Click verification link on Etherscan
- "This is tamper-proof, public proof that AI flagged this contract."

**[2:45–3:00] Close**
"ChainPilot AI brings institutional-grade Web3 security to every developer and user. This is the standard for safe on-chain interaction."

---

## 👥 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind CSS, Framer Motion, Recharts |
| Backend | Node.js, Express, Mongoose |
| AI | OpenAI GPT-4o (structured JSON mode) |
| Blockchain | ethers.js v6, Solidity 0.8.20 |
| Database | MongoDB |
| Smart Contract | AuditLog.sol (custom) |
| Logging | Winston |
| Scheduling | node-cron |

---

*Built with 🔥 for Nexora Hacks 2026*
